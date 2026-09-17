import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class CustomerController {
  static async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customers = await prisma.customer.findMany({
        orderBy: { companyName: 'asc' },
        include: {
          _count: {
            select: { enquiries: true, quotations: true, salesOrders: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyName, contactPerson, mobile, email, city } = req.body;

      const customer = await prisma.customer.create({
        data: {
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          mobile: mobile.trim(),
          email: email.toLowerCase().trim(),
          city: city.trim(),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Customer created successfully.',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }
}
