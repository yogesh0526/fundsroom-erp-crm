import { Request, Response, NextFunction } from 'express';
import { ChallanService } from '../services/challan.service';
import { PdfService } from '../services/pdf.service';

export class ChallanController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ChallanService.list(req.query);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challan = await ChallanService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const challan = await ChallanService.create({
        ...req.body,
        userId,
      });

      res.status(201).json({
        success: true,
        message: `Sales Challan created successfully in ${challan.status} status`,
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const challan = await ChallanService.updateStatus(
        req.params.id,
        req.body.status,
        userId
      );

      res.status(200).json({
        success: true,
        message: `Sales Challan status updated to ${challan.status}`,
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pdfBuffer = await PdfService.generateChallanPdf(req.params.id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="Challan-${req.params.id}.pdf"`
      );
      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}
