import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { CodeGeneratorService } from '../services/codeGenerator.service';
import { OrderStatus } from '@prisma/client';

export class DispatchController {
  /**
   * Section 7: Dispatch Process (Admin Only)
   * When stock is dispatched:
   * 1. Physical Quantity decreases
   * 2. Reserved Quantity decreases
   *
   * System prevents:
   * - Dispatch beyond reserved quantity
   * - Duplicate dispatch of the same quantity / order
   * - Dispatch of a cancelled or pending order
   */
  static async createDispatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: salesOrderId } = req.params;
      const { vehicleNumber, driverName, notes } = req.body;
      const adminUserId = req.user!.id;

      const order = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: {
            include: { product: true },
          },
          dispatch: true,
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Sales Order not found.',
        });
        return;
      }

      // Prevent dispatch of non-confirmed orders
      if (order.status !== OrderStatus.CONFIRMED) {
        res.status(400).json({
          success: false,
          message: `Cannot dispatch order: Sales Order must be in CONFIRMED status. Current status is ${order.status}.`,
        });
        return;
      }

      // Prevent duplicate dispatch
      if (order.dispatch) {
        res.status(409).json({
          success: false,
          message: `Sales Order has already been dispatched under Dispatch #${order.dispatch.dispatchNumber}.`,
        });
        return;
      }

      const dispatchNumber = await CodeGeneratorService.generateDispatchNumber();

      const dispatch = await prisma.$transaction(async (tx) => {
        // Double check within transaction
        const currentOrder = await tx.salesOrder.findUnique({
          where: { id: salesOrderId },
          include: { dispatch: true },
        });

        if (currentOrder?.dispatch || currentOrder?.status !== OrderStatus.CONFIRMED) {
          throw new Error('Sales order has already been dispatched or is not confirmed.');
        }

        const sortedItems = [...order.items].sort((a, b) => a.productId.localeCompare(b.productId));

        // Decrement both Physical and Reserved quantity for each product
        for (const item of sortedItems) {
          const lockedInventory: any[] = await tx.$queryRaw`
            SELECT id, "productId", "physicalQuantity", "reservedQuantity"
            FROM "inventory"
            WHERE "productId" = ${item.productId}
            FOR UPDATE;
          `;

          if (!lockedInventory || lockedInventory.length === 0) {
            throw new Error(`Inventory not found for product ${item.product.productName}`);
          }

          const inv = lockedInventory[0];
          const physical = Number(inv.physicalQuantity);
          const reserved = Number(inv.reservedQuantity);

          if (reserved < item.quantity) {
            throw new Error(
              `Cannot dispatch beyond reserved quantity for product "${item.product.productName}". Reserved: ${reserved}, Attempted: ${item.quantity}`
            );
          }

          if (physical < item.quantity) {
            throw new Error(
              `Cannot dispatch beyond physical quantity for product "${item.product.productName}". Physical: ${physical}, Attempted: ${item.quantity}`
            );
          }

          // Atomic decrement of both Physical and Reserved quantities
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              physicalQuantity: {
                decrement: item.quantity,
              },
              reservedQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Create Dispatch record
        const newDispatch = await tx.dispatch.create({
          data: {
            dispatchNumber,
            salesOrderId,
            dispatchDate: new Date(),
            vehicleNumber: vehicleNumber.trim(),
            driverName: driverName.trim(),
            notes: notes || null,
            createdById: adminUserId,
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
          include: {
            salesOrder: {
              include: { customer: true },
            },
            items: {
              include: { product: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Update Sales Order status to DISPATCHED
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: {
            status: OrderStatus.DISPATCHED,
          },
        });

        return newDispatch;
      });

      res.status(201).json({
        success: true,
        message: `Sales Order ${order.orderNumber} dispatched successfully under ${dispatch.dispatchNumber}.`,
        data: dispatch,
      });
    } catch (error: any) {
      if (
        error.message?.includes('Cannot dispatch beyond') ||
        error.message?.includes('already been dispatched')
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

  static async getDispatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dispatches = await prisma.dispatch.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          salesOrder: {
            include: {
              customer: true,
              quotation: true,
            },
          },
          items: {
            include: { product: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: dispatches,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDispatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const dispatch = await prisma.dispatch.findUnique({
        where: { id },
        include: {
          salesOrder: {
            include: {
              customer: true,
              quotation: true,
              items: { include: { product: true } },
            },
          },
          items: {
            include: {
              product: {
                include: { inventory: true },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!dispatch) {
        res.status(404).json({
          success: false,
          message: 'Dispatch record not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: dispatch,
      });
    } catch (error) {
      next(error);
    }
  }
}
