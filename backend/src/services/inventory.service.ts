import prisma from '../config/prisma';
import { MovementType, Prisma } from '@prisma/client';

export interface MovementListQuery {
  page?: number;
  limit?: number;
  productId?: string;
  movementType?: MovementType;
  search?: string;
}

export class InventoryService {
  static async adjustStock(data: {
    productId: string;
    quantity: number;
    movementType: MovementType;
    reason: string;
    createdById: string;
    referenceId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: data.productId },
      });

      if (!product) {
        const err: any = new Error('Product not found');
        err.statusCode = 404;
        throw err;
      }

      if (data.movementType === MovementType.OUT) {
        if (product.currentStock < data.quantity) {
          const err: any = new Error(
            `Insufficient stock for '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${data.quantity}. Stock cannot go negative.`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      const updatedProduct = await tx.product.update({
        where: { id: data.productId },
        data: {
          currentStock:
            data.movementType === MovementType.IN
              ? { increment: data.quantity }
              : { decrement: data.quantity },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          movementType: data.movementType,
          reason: data.reason,
          referenceId: data.referenceId || null,
          createdById: data.createdById,
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      return {
        movement,
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          sku: updatedProduct.sku,
          newCurrentStock: updatedProduct.currentStock,
        },
      };
    });
  }

  static async listMovements(query: MovementListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.movementType) {
      where.movementType = query.movementType;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { reason: { contains: term, mode: 'insensitive' } },
        { referenceId: { contains: term, mode: 'insensitive' } },
        { product: { name: { contains: term, mode: 'insensitive' } } },
        { product: { sku: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, category: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
    ]);

    return {
      data: movements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
