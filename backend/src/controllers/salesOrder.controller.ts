import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { OrderStatus } from '@prisma/client';

export class SalesOrderController {
  static async getSalesOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, customerId } = req.query;

      const whereClause: any = {};
      if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
        whereClause.status = status as OrderStatus;
      }
      if (customerId && typeof customerId === 'string') {
        whereClause.customerId = customerId;
      }

      const orders = await prisma.salesOrder.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          quotation: {
            select: {
              id: true,
              quotationNumber: true,
              enquiry: {
                select: { id: true, enquiryNumber: true },
              },
            },
          },
          items: {
            include: {
              product: {
                include: { inventory: true },
              },
            },
          },
          confirmedBy: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          dispatch: {
            select: {
              id: true,
              dispatchNumber: true,
              dispatchDate: true,
              vehicleNumber: true,
              driverName: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSalesOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const order = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          quotation: {
            include: {
              enquiry: {
                include: { customer: true },
              },
            },
          },
          items: {
            include: {
              product: {
                include: { inventory: true },
              },
            },
          },
          confirmedBy: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          dispatch: {
            include: {
              items: {
                include: { product: true },
              },
              createdBy: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Sales Order not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Section 6 & Important Backend Challenge:
   * Inventory Reservation on Order Confirmation (Admin only).
   *
   * Solves the concurrency race condition:
   * Uses PostgreSQL pessimistic row-level locking (`SELECT ... FOR UPDATE`) inside
   * an interactive database transaction.
   *
   * If User A and User B attempt to confirm orders simultaneously exceeding available stock,
   * PostgreSQL serializes the access on the locked inventory rows. The second request
   * reads the updated reservation count, sees that requirement > available, and aborts safely.
   */
  static async confirmSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminUserId = req.user!.id;

      // 1. Check order status before starting transaction
      const order = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Sales Order not found.',
        });
        return;
      }

      if (order.status !== OrderStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: `Cannot confirm Sales Order: Status is already ${order.status}. Only PENDING orders can be confirmed.`,
        });
        return;
      }

      // 2. Execute reservation within atomic transaction with row-level locks
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Double-check order status inside transaction to prevent double confirmation
        const currentOrder = await tx.salesOrder.findUnique({
          where: { id },
        });

        if (currentOrder?.status !== OrderStatus.PENDING) {
          throw new Error(`Order has already been processed (Current status: ${currentOrder?.status})`);
        }

        // Sort items by productId to prevent potential deadlocks when locking multiple rows
        const sortedItems = [...order.items].sort((a, b) => a.productId.localeCompare(b.productId));

        for (const item of sortedItems) {
          // Pessimistic Row Lock: blocks concurrent transactions until this transaction completes
          const lockedInventory: any[] = await tx.$queryRaw`
            SELECT id, "productId", "physicalQuantity", "reservedQuantity", "damagedQuantity"
            FROM "inventory"
            WHERE "productId" = ${item.productId}
            FOR UPDATE;
          `;

          if (!lockedInventory || lockedInventory.length === 0) {
            throw new Error(`Inventory record not found for product ${item.product.productName}`);
          }

          const inv = lockedInventory[0];
          const physical = Number(inv.physicalQuantity);
          const reserved = Number(inv.reservedQuantity);
          const damaged = Number(inv.damagedQuantity);
          const available = physical - reserved - damaged;

          // Check available stock
          if (available < item.quantity) {
            throw new Error(
              `Insufficient stock for "${item.product.productName}" (${item.product.productCode}). ` +
              `Required: ${item.quantity}, Available: ${available} (Physical: ${physical}, Reserved: ${reserved}).`
            );
          }

          // Atomic reservation update: Physical quantity does NOT decrease during reservation!
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              reservedQuantity: {
                increment: item.quantity,
              },
            },
          });
        }

        // Update Sales Order to CONFIRMED
        return tx.salesOrder.update({
          where: { id },
          data: {
            status: OrderStatus.CONFIRMED,
            confirmedAt: new Date(),
            confirmedById: adminUserId,
          },
          include: {
            customer: true,
            items: {
              include: {
                product: {
                  include: { inventory: true },
                },
              },
            },
            confirmedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });
      });

      res.status(200).json({
        success: true,
        message: `Sales Order ${updatedOrder.orderNumber} confirmed and inventory successfully reserved.`,
        data: updatedOrder,
      });
    } catch (error: any) {
      if (
        error.message?.includes('Insufficient stock') ||
        error.message?.includes('already been processed')
      ) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Bonus Feature (Page 11):
   * Allow a confirmed Sales Order to be cancelled and correctly release its reserved inventory.
   */
  static async cancelSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const order = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Sales Order not found.',
        });
        return;
      }

      if (order.status === OrderStatus.CANCELLED) {
        res.status(400).json({
          success: false,
          message: 'Sales Order is already cancelled.',
        });
        return;
      }

      if (order.status === OrderStatus.DISPATCHED) {
        res.status(400).json({
          success: false,
          message: 'Cannot cancel a Sales Order that has already been dispatched.',
        });
        return;
      }

      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // If the order was CONFIRMED, release the reserved inventory
        if (order.status === OrderStatus.CONFIRMED) {
          const sortedItems = [...order.items].sort((a, b) => a.productId.localeCompare(b.productId));

          for (const item of sortedItems) {
            // Lock row for update
            await tx.$queryRaw`
              SELECT id FROM "inventory" WHERE "productId" = ${item.productId} FOR UPDATE;
            `;

            await tx.inventory.update({
              where: { productId: item.productId },
              data: {
                reservedQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }

        return tx.salesOrder.update({
          where: { id },
          data: {
            status: OrderStatus.CANCELLED,
          },
          include: {
            customer: true,
            items: {
              include: {
                product: {
                  include: { inventory: true },
                },
              },
            },
          },
        });
      });

      res.status(200).json({
        success: true,
        message: `Sales Order ${cancelledOrder.orderNumber} has been cancelled${
          order.status === OrderStatus.CONFIRMED ? ' and reserved inventory released' : ''
        }.`,
        data: cancelledOrder,
      });
    } catch (error) {
      next(error);
    }
  }
}
