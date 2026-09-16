import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';

export class InventoryController {
  static async adjust(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await InventoryService.adjustStock({
        ...req.body,
        createdById: userId,
      });

      res.status(200).json({
        success: true,
        message: `Stock successfully adjusted (${req.body.movementType} ${req.body.quantity} units)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InventoryService.listMovements(req.query);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}
