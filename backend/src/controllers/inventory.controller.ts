import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class InventoryController {
  static async getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inventoryList = await prisma.inventory.findMany({
        include: {
          product: true,
        },
        orderBy: {
          product: {
            productCode: 'asc',
          },
        },
      });

      const formatted = inventoryList.map((item) => {
        const physical = item.physicalQuantity;
        const reserved = item.reservedQuantity;
        const damaged = item.damagedQuantity;
        const available = Math.max(0, physical - reserved - damaged);

        return {
          id: item.id,
          productId: item.productId,
          productCode: item.product.productCode,
          productName: item.product.productName,
          category: item.product.category,
          unit: item.product.unit,
          physicalQuantity: physical,
          reservedQuantity: reserved,
          damagedQuantity: damaged,
          availableQuantity: available,
          updatedAt: item.updatedAt,
        };
      });

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // inventory id or product id
      const { physicalQuantity, damagedQuantity } = req.body;

      const existing = await prisma.inventory.findFirst({
        where: {
          OR: [{ id }, { productId: id }],
        },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Inventory record not found.',
        });
        return;
      }

      const newPhysical = physicalQuantity !== undefined ? physicalQuantity : existing.physicalQuantity;
      const newDamaged = damagedQuantity !== undefined ? damagedQuantity : existing.damagedQuantity;

      if (newPhysical < 0 || newDamaged < 0) {
        res.status(400).json({
          success: false,
          message: 'Quantities cannot be negative.',
        });
        return;
      }

      if (existing.reservedQuantity + newDamaged > newPhysical) {
        res.status(400).json({
          success: false,
          message: `Cannot update inventory: Reserved (${existing.reservedQuantity}) + Damaged (${newDamaged}) cannot exceed Physical quantity (${newPhysical}).`,
        });
        return;
      }

      const updated = await prisma.inventory.update({
        where: { id: existing.id },
        data: {
          physicalQuantity: newPhysical,
          damagedQuantity: newDamaged,
        },
        include: {
          product: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Inventory updated successfully.',
        data: {
          ...updated,
          availableQuantity: updated.physicalQuantity - updated.reservedQuantity - updated.damagedQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
