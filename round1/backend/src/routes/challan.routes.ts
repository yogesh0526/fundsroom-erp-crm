import { Router } from 'express';
import { ChallanController } from '../controllers/challan.controller';
import { authenticateJWT } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { validateRequest } from '../middlewares/validate';
import { createChallanSchema, updateChallanStatusSchema } from '../validations';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

// All roles can view challans (Sales, Warehouse, Accounts, Admin)
router.get('/', ChallanController.list);
router.get('/:id', ChallanController.getById);
router.get('/:id/pdf', ChallanController.downloadPdf);

// Sales & Admin can create sales challans
router.post(
  '/',
  requireRole(Role.SALES),
  validateRequest(createChallanSchema),
  ChallanController.create
);

// Sales, Warehouse (confirm dispatch), and Admin can change challan status
router.patch(
  '/:id/status',
  requireRole(Role.SALES, Role.WAREHOUSE),
  validateRequest(updateChallanStatusSchema),
  ChallanController.updateStatus
);

export default router;
