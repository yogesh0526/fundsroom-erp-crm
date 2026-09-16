import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticateJWT } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { validateRequest } from '../middlewares/validate';
import { stockAdjustmentSchema } from '../validations';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

// Stock adjustment is strictly Warehouse & Admin
router.post(
  '/adjust',
  requireRole(Role.WAREHOUSE),
  validateRequest(stockAdjustmentSchema),
  InventoryController.adjust
);

// Stock movement ledger can be viewed by Warehouse and Admin
router.get(
  '/movements',
  requireRole(Role.WAREHOUSE),
  InventoryController.listMovements
);

export default router;
