import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { CodeGeneratorService } from '../services/codeGenerator.service';
import { EnquiryStatus } from '@prisma/client';

export class EnquiryController {
  static async createEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerId, requiredDate, notes, items } = req.body;
      const userId = req.user!.id;

      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        res.status(404).json({
          success: false,
          message: 'Customer not found.',
        });
        return;
      }

      // Verify products exist
      const productIds = items.map((i: any) => i.productId);
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (existingProducts.length !== productIds.length) {
        res.status(400).json({
          success: false,
          message: 'One or more products specified in the enquiry do not exist.',
        });
        return;
      }

      const enquiryNumber = await CodeGeneratorService.generateEnquiryNumber();

      const enquiry = await prisma.$transaction(async (tx) => {
        return tx.enquiry.create({
          data: {
            enquiryNumber,
            customerId,
            requiredDate: new Date(requiredDate),
            notes,
            status: EnquiryStatus.NEW,
            createdById: userId,
            items: {
              create: items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                notes: item.notes || null,
              })),
            },
          },
          include: {
            customer: true,
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        });
      });

      res.status(201).json({
        success: true,
        message: 'Enquiry created successfully.',
        data: enquiry,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEnquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, customerId } = req.query;

      const whereClause: any = {};
      if (status && Object.values(EnquiryStatus).includes(status as EnquiryStatus)) {
        whereClause.status = status as EnquiryStatus;
      }
      if (customerId && typeof customerId === 'string') {
        whereClause.customerId = customerId;
      }

      const enquiries = await prisma.enquiry.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          items: {
            include: {
              product: true,
            },
          },
          quotations: {
            select: {
              id: true,
              quotationNumber: true,
              status: true,
              grandTotal: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: enquiries,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEnquiryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const enquiry = await prisma.enquiry.findUnique({
        where: { id },
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          items: {
            include: {
              product: {
                include: {
                  inventory: true,
                },
              },
            },
          },
          quotations: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!enquiry) {
        res.status(404).json({
          success: false,
          message: 'Enquiry not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: enquiry,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateEnquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const enquiry = await prisma.enquiry.findUnique({
        where: { id },
      });

      if (!enquiry) {
        res.status(404).json({
          success: false,
          message: 'Enquiry not found.',
        });
        return;
      }

      const updated = await prisma.enquiry.update({
        where: { id },
        data: { status: status as EnquiryStatus },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      res.status(200).json({
        success: true,
        message: `Enquiry status updated to ${status}.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
