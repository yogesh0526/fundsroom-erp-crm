import { Router } from 'express';
import { QuotationController } from '../controllers/quotation.controller';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { quotationSchema, quotationStatusSchema } from '../validations';

const router = Router();

router.post('/', authenticateToken, validateRequest(quotationSchema), QuotationController.createQuotation);
router.get('/', authenticateToken, QuotationController.getQuotations);
router.get('/:id', authenticateToken, QuotationController.getQuotationById);
router.patch('/:id/status', authenticateToken, validateRequest(quotationStatusSchema), QuotationController.updateQuotationStatus);
router.post('/:id/convert', authenticateToken, QuotationController.convertToSalesOrder);

export default router;
