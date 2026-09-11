import prisma from '../config/prisma';
import { ChallanStatus, MovementType, Prisma } from '@prisma/client';
import { generateChallanNumber } from '../utils/generators';

export interface ChallanListQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: ChallanStatus;
  search?: string;
}

export class ChallanService {
  static async list(query: ChallanListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ChallanWhereInput = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { challanNumber: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { businessName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, challans] = await Promise.all([
      prisma.challan.count({ where }),
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, businessName: true, mobile: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          items: true,
          invoice: {
            select: { id: true, invoiceNumber: true, status: true, totalAmount: true },
          },
        },
      }),
    ]);

    return {
      data: challans,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, currentStock: true, minStockAlert: true },
            },
          },
        },
        invoice: true,
      },
    });

    if (!challan) {
      const err: any = new Error('Sales Challan not found');
      err.statusCode = 404;
      throw err;
    }

    return challan;
  }

  static async create(data: {
    customerId: string;
    items: { productId: string; quantity: number }[];
    status?: ChallanStatus;
    notes?: string | null;
    userId: string;
  }) {
    const targetStatus = data.status || ChallanStatus.DRAFT;

    // Verify Customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      const err: any = new Error('Customer not found');
      err.statusCode = 404;
      throw err;
    }

    // Customer Snapshot to ensure immutability
    const customerSnapshot = {
      name: customer.name,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber,
      customerType: customer.customerType,
      address: customer.address,
      mobile: customer.mobile,
      email: customer.email,
    };

    // Execute in a transaction to guarantee data consistency and stock invariance
    return prisma.$transaction(async (tx) => {
      // 1. Fetch all products in the challan
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        const err: any = new Error('One or more selected products do not exist');
        err.statusCode = 400;
        throw err;
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalQuantity = 0;
      let totalAmount = 0;

      // Prepare items with snapshots
      const preparedItems = data.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const lineTotal = product.unitPrice * item.quantity;
        totalQuantity += item.quantity;
        totalAmount += lineTotal;

        return {
          productId: product.id,
          productName: product.name, // Snapshot
          sku: product.sku,           // Snapshot
          unitPrice: product.unitPrice, // Snapshot
          quantity: item.quantity,
          totalPrice: lineTotal,
        };
      });

      // Generate unique sequential challan number
      const challanNumber = await generateChallanNumber();

      // 2. If CONFIRMED immediately, validate and reduce stock
      if (targetStatus === ChallanStatus.CONFIRMED) {
        for (const item of data.items) {
          const product = productMap.get(item.productId)!;
          if (product.currentStock < item.quantity) {
            const err: any = new Error(
              `Insufficient stock for '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${item.quantity}. Stock cannot go negative.`
            );
            err.statusCode = 400;
            throw err;
          }

          // Decrement stock
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: { decrement: item.quantity } },
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              quantity: item.quantity,
              movementType: MovementType.OUT,
              reason: 'CHALLAN_DISPATCH',
              referenceId: challanNumber,
              createdById: data.userId,
            },
          });
        }
      }

      // 3. Create the Challan and items
      const newChallan = await tx.challan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          customerSnapshot,
          totalQuantity,
          totalAmount,
          status: targetStatus,
          notes: data.notes || null,
          createdById: data.userId,
          items: {
            create: preparedItems,
          },
        },
        include: {
          customer: true,
          items: true,
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      return newChallan;
    });
  }

  static async updateStatus(
    id: string,
    newStatus: ChallanStatus,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const challan = await tx.challan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        const err: any = new Error('Sales Challan not found');
        err.statusCode = 404;
        throw err;
      }

      if (challan.status === newStatus) {
        return challan;
      }

      // Transition 1: DRAFT -> CONFIRMED
      if (challan.status === ChallanStatus.DRAFT && newStatus === ChallanStatus.CONFIRMED) {
        for (const item of challan.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            const err: any = new Error(`Product ${item.productName} no longer exists`);
            err.statusCode = 400;
            throw err;
          }

          if (product.currentStock < item.quantity) {
            const err: any = new Error(
              `Insufficient stock for '${item.productName}' (SKU: ${item.sku}). Available: ${product.currentStock}, Requested: ${item.quantity}. Stock cannot go negative.`
            );
            err.statusCode = 400;
            throw err;
          }

          // Decrement stock
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: { decrement: item.quantity } },
          });

          // Log movement
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              quantity: item.quantity,
              movementType: MovementType.OUT,
              reason: 'CHALLAN_DISPATCH',
              referenceId: challan.challanNumber,
              createdById: userId,
            },
          });
        }
      }

      // Transition 2: CONFIRMED -> CANCELLED
      else if (challan.status === ChallanStatus.CONFIRMED && newStatus === ChallanStatus.CANCELLED) {
        // Return goods back to stock
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: MovementType.IN,
              reason: 'CHALLAN_CANCELLED_RESTOCK',
              referenceId: challan.challanNumber,
              createdById: userId,
            },
          });
        }

        // If an invoice was generated, cancel the invoice as well
        await tx.invoice.updateMany({
          where: { challanId: challan.id },
          data: { status: 'CANCELLED' },
        });
      }

      // Transition 3: DRAFT -> CANCELLED (No stock effect)
      else if (challan.status === ChallanStatus.DRAFT && newStatus === ChallanStatus.CANCELLED) {
        // Simple cancellation without stock movement
      } else {
        const err: any = new Error(
          `Cannot change status from ${challan.status} to ${newStatus}`
        );
        err.statusCode = 400;
        throw err;
      }

      const updated = await tx.challan.update({
        where: { id },
        data: { status: newStatus },
        include: {
          customer: true,
          items: true,
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      return updated;
    });
  }
}
