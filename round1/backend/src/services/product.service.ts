import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: boolean | string;
}

export class ProductService {
  static async list(query: ProductListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    // In Prisma, filtering fields against each other (currentStock <= minStockAlert)
    // can be done via Raw Query or post-filtering, or by fetching and comparing
    const isLowStockFilter = query.lowStock === true || query.lowStock === 'true';

    let total = 0;
    let products: any[] = [];

    if (isLowStockFilter) {
      // Fetch low stock items where currentStock <= minStockAlert
      const lowStockProducts = await prisma.$queryRaw<any[]>`
        SELECT * FROM products 
        WHERE "currentStock" <= "minStockAlert"
        ORDER BY "currentStock" ASC
      `;

      total = lowStockProducts.length;
      products = lowStockProducts.slice(skip, skip + limit);
    } else {
      [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
      ]);
    }

    // Enhance each product with isLowStock flag
    const data = products.map((p) => ({
      ...p,
      isLowStock: p.currentStock <= p.minStockAlert,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            createdBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!product) {
      const err: any = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      ...product,
      isLowStock: product.currentStock <= product.minStockAlert,
    };
  }

  static async create(data: {
    name: string;
    sku: string;
    category: string;
    unitPrice: number;
    currentStock?: number;
    minStockAlert?: number;
    location: string;
    imageUrl?: string | null;
  }) {
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku.toUpperCase().trim() },
    });

    if (existing) {
      const err: any = new Error(`Product with SKU '${data.sku}' already exists`);
      err.statusCode = 400;
      throw err;
    }

    return prisma.product.create({
      data: {
        name: data.name.trim(),
        sku: data.sku.toUpperCase().trim(),
        category: data.category.trim(),
        unitPrice: data.unitPrice,
        currentStock: data.currentStock ?? 0,
        minStockAlert: data.minStockAlert ?? 5,
        location: data.location.trim(),
        imageUrl: data.imageUrl || null,
      },
    });
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      sku: string;
      category: string;
      unitPrice: number;
      minStockAlert: number;
      location: string;
      imageUrl: string | null;
    }>
  ) {
    await this.getById(id);

    if (data.sku) {
      const existing = await prisma.product.findUnique({
        where: { sku: data.sku.toUpperCase().trim() },
      });
      if (existing && existing.id !== id) {
        const err: any = new Error(`SKU '${data.sku}' is already in use by another product`);
        err.statusCode = 400;
        throw err;
      }
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.sku && { sku: data.sku.toUpperCase().trim() }),
        ...(data.category && { category: data.category.trim() }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.minStockAlert !== undefined && { minStockAlert: data.minStockAlert }),
        ...(data.location && { location: data.location.trim() }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    });
  }

  static async updateImage(id: string, imageUrl: string) {
    await this.getById(id);
    return prisma.product.update({
      where: { id },
      data: { imageUrl },
    });
  }
}
