import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/', authenticateToken, ProductController.getProducts);

export default router;
