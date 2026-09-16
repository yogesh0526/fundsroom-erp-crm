import prisma from '../config/prisma';
import { ChallanStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { generateInvoiceNumber } from '../utils/generators';

export interface InvoiceListQuery {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  search?: string;
}

export class InvoiceService {
  static async list(query: InvoiceListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { challan: { challanNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          challan: {
            include: {
              customer: true,
              items: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        challan: {
          include: {
            customer: true,
            items: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!invoice) {
      const err: any = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    return invoice;
  }

  static async generateFromChallan(challanId: string, userId: string) {
    const challan = await prisma.challan.findUnique({
      where: { id: challanId },
      include: { invoice: true },
    });

    if (!challan) {
      const err: any = new Error('Sales Challan not found');
      err.statusCode = 404;
      throw err;
    }

    if (challan.status !== ChallanStatus.CONFIRMED) {
      const err: any = new Error('Invoices can only be generated for CONFIRMED sales challans');
      err.statusCode = 400;
      throw err;
    }

    if (challan.invoice) {
      const err: any = new Error(
        `Invoice already exists for this challan (Invoice #: ${challan.invoice.invoiceNumber})`
      );
      err.statusCode = 400;
      throw err;
    }

    const subtotal = challan.totalAmount;
    const taxRate = 18.0; // 18% standard GST
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        challanId: challan.id,
        customerId: challan.customerId,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        status: InvoiceStatus.ISSUED,
        createdById: userId,
      },
      include: {
        challan: {
          include: {
            customer: true,
            items: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return invoice;
  }
}
