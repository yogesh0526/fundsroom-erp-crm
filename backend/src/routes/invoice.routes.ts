import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticateJWT } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

// Accounts & Admin can list, view, and download invoice PDFs
router.get('/', requireRole(Role.ACCOUNTS), InvoiceController.list);
router.get('/:id', requireRole(Role.ACCOUNTS), InvoiceController.getById);
router.get('/:id/pdf', requireRole(Role.ACCOUNTS), InvoiceController.downloadPdf);

// Accounts & Admin can generate an invoice from a Confirmed Challan
router.post(
  '/generate/:challanId',
  requireRole(Role.ACCOUNTS),
  InvoiceController.generate
);

export default router;
