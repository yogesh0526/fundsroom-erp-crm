import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { CodeGeneratorService } from '../services/codeGenerator.service';
import { CalculationService } from '../services/calculation.service';
import { QuotationStatus, EnquiryStatus, OrderStatus } from '@prisma/client';

export class QuotationController {
  static async createQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enquiryId, validUntil, notes, items } = req.body;
      const userId = req.user!.id;

      // Verify enquiry exists
      const enquiry = await prisma.enquiry.findUnique({
        where: { id: enquiryId },
        include: { customer: true },
      });

      if (!enquiry) {
        res.status(404).json({
          success: false,
          message: 'Referenced enquiry was not found.',
        });
        return;
      }

      // Backend price calculation: Never blindly accept totals from client
      const calculation = CalculationService.calculateQuotation(items);
      const quotationNumber = await CodeGeneratorService.generateQuotationNumber();

      const quotation = await prisma.$transaction(async (tx) => {
        const created = await tx.quotation.create({
          data: {
            quotationNumber,
            enquiryId,
            customerId: enquiry.customerId,
            validUntil: new Date(validUntil),
            subtotal: calculation.subtotal,
            totalDiscount: calculation.totalDiscount,
            totalGst: calculation.totalGst,
            grandTotal: calculation.grandTotal,
            status: QuotationStatus.DRAFT,
            notes,
            createdById: userId,
            items: {
              create: calculation.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent,
                gstPercent: item.gstPercent,
                baseAmount: item.baseAmount,
                discountAmount: item.discountAmount,
                taxableAmount: item.taxableAmount,
                gstAmount: item.gstAmount,
                lineAmount: item.lineAmount,
              })),
            },
          },
          include: {
            customer: true,
            enquiry: true,
            items: {
              include: {
                product: true,
              },
            },
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });

        // Automatically update Enquiry status to QUOTED
        await tx.enquiry.update({
          where: { id: enquiryId },
          data: { status: EnquiryStatus.QUOTED },
        });

        return created;
      });

      res.status(201).json({
        success: true,
        message: 'Quotation generated successfully.',
        data: quotation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, enquiryId, customerId } = req.query;

      const whereClause: any = {};
      if (status && Object.values(QuotationStatus).includes(status as QuotationStatus)) {
        whereClause.status = status as QuotationStatus;
      }
      if (enquiryId && typeof enquiryId === 'string') {
        whereClause.enquiryId = enquiryId;
      }
      if (customerId && typeof customerId === 'string') {
        whereClause.customerId = customerId;
      }

      const quotations = await prisma.quotation.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          enquiry: {
            select: { enquiryNumber: true, status: true },
          },
          items: {
            include: {
              product: true,
            },
          },
          salesOrder: {
            select: { id: true, orderNumber: true, status: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: quotations,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuotationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          customer: true,
          enquiry: {
            include: {
              items: { include: { product: true } },
            },
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
          salesOrder: {
            include: {
              items: true,
              dispatch: true,
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      if (!quotation) {
        res.status(404).json({
          success: false,
          message: 'Quotation not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: quotation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuotationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const quotation = await prisma.quotation.findUnique({
        where: { id },
      });

      if (!quotation) {
        res.status(404).json({
          success: false,
          message: 'Quotation not found.',
        });
        return;
      }

      const updated = await prisma.quotation.update({
        where: { id },
        data: { status: status as QuotationStatus },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      res.status(200).json({
        success: true,
        message: `Quotation status updated to ${status}.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Section 5: Quotation -> Sales Order Conversion
   * Rules:
   * 1. DRAFT quotation cannot create an order.
   * 2. REJECTED quotation cannot create an order.
   * 3. One quotation should not accidentally generate multiple Sales Orders.
   * 4. Customer -> Enquiry -> Quotation -> Sales Order traceability maintained.
   */
  static async convertToSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          items: true,
          salesOrder: true,
          enquiry: true,
        },
      });

      if (!quotation) {
        res.status(404).json({
          success: false,
          message: 'Quotation not found.',
        });
        return;
      }

      // Rule 1 & 2: DRAFT or REJECTED quotation cannot create an order
      if (quotation.status !== QuotationStatus.ACCEPTED) {
        res.status(400).json({
          success: false,
          message: `Cannot convert quotation: Only ACCEPTED quotations can be converted to a Sales Order. Current status is ${quotation.status}.`,
        });
        return;
      }

      // Rule 3: One quotation should not generate multiple Sales Orders
      if (quotation.salesOrder) {
        res.status(409).json({
          success: false,
          message: `Conflict: A Sales Order (${quotation.salesOrder.orderNumber}) has already been generated for this quotation.`,
        });
        return;
      }

      const orderNumber = await CodeGeneratorService.generateOrderNumber();

      const salesOrder = await prisma.$transaction(async (tx) => {
        // Double-check inside transaction to prevent race conditions
        const existingOrder = await tx.salesOrder.findUnique({
          where: { quotationId: id },
        });

        if (existingOrder) {
          throw new Error('A Sales Order has already been generated for this quotation.');
        }

        const newOrder = await tx.salesOrder.create({
          data: {
            orderNumber,
            customerId: quotation.customerId,
            quotationId: quotation.id,
            orderDate: new Date(),
            totalAmount: quotation.grandTotal,
            status: OrderStatus.PENDING,
            notes: `Converted from Quotation ${quotation.quotationNumber}`,
            createdById: userId,
            items: {
              create: quotation.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineAmount: item.lineAmount,
              })),
            },
          },
          include: {
            customer: true,
            quotation: {
              include: { enquiry: true },
            },
            items: {
              include: { product: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });

        // Update Enquiry status to WON
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: EnquiryStatus.WON },
        });

        return newOrder;
      });

      res.status(201).json({
        success: true,
        message: `Quotation ${quotation.quotationNumber} successfully converted to Sales Order ${salesOrder.orderNumber}.`,
        data: salesOrder,
      });
    } catch (error: any) {
      if (error.message?.includes('already been generated')) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }
}
