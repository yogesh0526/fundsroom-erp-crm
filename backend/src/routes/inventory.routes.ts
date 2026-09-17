import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { validateRequest } from '../middlewares/validate';
import { inventoryUpdateSchema } from '../validations';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateToken, InventoryController.getInventory);
router.patch(
  '/:id',
  authenticateToken,
  requireRole([Role.ADMIN]),
  validateRequest(inventoryUpdateSchema),
  InventoryController.updateInventory
);

export default router;
