import { Router } from 'express';
import { EnquiryController } from '../controllers/enquiry.controller';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { enquirySchema, enquiryStatusSchema } from '../validations';

const router = Router();

router.post('/', authenticateToken, validateRequest(enquirySchema), EnquiryController.createEnquiry);
router.get('/', authenticateToken, EnquiryController.getEnquiries);
router.get('/:id', authenticateToken, EnquiryController.getEnquiryById);
router.patch('/:id/status', authenticateToken, validateRequest(enquiryStatusSchema), EnquiryController.updateEnquiryStatus);

export default router;
