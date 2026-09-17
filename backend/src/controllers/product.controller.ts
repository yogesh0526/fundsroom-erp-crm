import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class ProductController {
  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await prisma.product.findMany({
        orderBy: { productCode: 'asc' },
        include: {
          inventory: true,
        },
      });

      const formattedProducts = products.map((product) => {
        const physical = product.inventory?.physicalQuantity || 0;
        const reserved = product.inventory?.reservedQuantity || 0;
        const damaged = product.inventory?.damagedQuantity || 0;
        const available = Math.max(0, physical - reserved - damaged);

        return {
          id: product.id,
          productCode: product.productCode,
          productName: product.productName,
          category: product.category,
          unit: product.unit,
          basePrice: product.basePrice,
          createdAt: product.createdAt,
          inventory: {
            physicalQuantity: physical,
            reservedQuantity: reserved,
            damagedQuantity: damaged,
            availableQuantity: available,
          },
        };
      });

      res.status(200).json({
        success: true,
        data: formattedProducts,
      });
    } catch (error) {
      next(error);
    }
  }
}
