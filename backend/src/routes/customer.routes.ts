import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { customerSchema } from '../validations';

const router = Router();

router.get('/', authenticateToken, CustomerController.getCustomers);
router.post('/', authenticateToken, validateRequest(customerSchema), CustomerController.createCustomer);

export default router;
