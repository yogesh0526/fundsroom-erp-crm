import prisma from '../config/prisma';
import { CustomerType, CustomerStatus, Prisma } from '@prisma/client';

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: CustomerType;
  status?: CustomerStatus;
}

export class CustomerService {
  static async list(query: CustomerListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { businessName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { mobile: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.type) {
      where.customerType = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              challans: true,
              followUps: true,
            },
          },
        },
      }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            createdBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      const err: any = new Error('Customer not found');
      err.statusCode = 404;
      throw err;
    }

    return customer;
  }

  static async create(data: {
    name: string;
    mobile: string;
    email: string;
    businessName: string;
    gstNumber?: string | null;
    customerType: CustomerType;
    address: string;
    status?: CustomerStatus;
    followUpDate?: string | null;
    notes?: string | null;
  }) {
    return prisma.customer.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email.toLowerCase(),
        businessName: data.businessName,
        gstNumber: data.gstNumber || null,
        customerType: data.customerType,
        address: data.address,
        status: data.status || CustomerStatus.LEAD,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        notes: data.notes || null,
      },
    });
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      mobile: string;
      email: string;
      businessName: string;
      gstNumber?: string | null;
      customerType: CustomerType;
      address: string;
      status: CustomerStatus;
      followUpDate?: string | null;
      notes?: string | null;
    }>
  ) {
    await this.getById(id);

    const updateData: any = { ...data };
    if (data.email) {
      updateData.email = data.email.toLowerCase();
    }
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
    }

    return prisma.customer.update({
      where: { id },
      data: updateData,
    });
  }

  static async addFollowUp(
    customerId: string,
    userId: string,
    data: { note: string; nextFollowUpDate?: string | null }
  ) {
    await this.getById(customerId);

    const followUp = await prisma.customerFollowUp.create({
      data: {
        customerId,
        note: data.note,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (data.nextFollowUpDate) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { followUpDate: new Date(data.nextFollowUpDate) },
      });
    }

    return followUp;
  }
}
