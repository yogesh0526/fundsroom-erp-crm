import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticateJWT } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { validateRequest } from '../middlewares/validate';
import { customerSchema, customerUpdateSchema, followUpSchema } from '../validations';
import { Role } from '@prisma/client';

const router = Router();

// All customer routes require authentication
router.use(authenticateJWT);

router.get('/', requireRole(Role.SALES, Role.ACCOUNTS), CustomerController.list);
router.get('/:id', requireRole(Role.SALES, Role.ACCOUNTS), CustomerController.getById);

router.post(
  '/',
  requireRole(Role.SALES),
  validateRequest(customerSchema),
  CustomerController.create
);

router.put(
  '/:id',
  requireRole(Role.SALES),
  validateRequest(customerUpdateSchema),
  CustomerController.update
);

router.post(
  '/:id/follow-ups',
  requireRole(Role.SALES),
  validateRequest(followUpSchema),
  CustomerController.addFollowUp
);

export default router;
