import { Router } from 'express';
import { SalesOrderController } from '../controllers/salesOrder.controller';
import { DispatchController } from '../controllers/dispatch.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { validateRequest } from '../middlewares/validate';
import { dispatchSchema } from '../validations';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateToken, SalesOrderController.getSalesOrders);
router.get('/:id', authenticateToken, SalesOrderController.getSalesOrderById);

// Order confirmation triggers inventory reservation (Admin only)
router.post(
  '/:id/confirm',
  authenticateToken,
  requireRole([Role.ADMIN]),
  SalesOrderController.confirmSalesOrder
);

// Order dispatch (Admin only)
router.post(
  '/:id/dispatch',
  authenticateToken,
  requireRole([Role.ADMIN]),
  validateRequest(dispatchSchema),
  DispatchController.createDispatch
);

// Order cancellation (releases reserved stock if confirmed)
router.post('/:id/cancel', authenticateToken, SalesOrderController.cancelSalesOrder);

export default router;
