import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateJWT } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleGuard';
import { validateRequest } from '../middlewares/validate';
import { productSchema, productUpdateSchema } from '../validations';
import { upload } from '../services/upload.service';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

// All roles can view products (Sales creates challans, Warehouse manages stock, Accounts audits value)
router.get('/', ProductController.list);
router.get('/:id', ProductController.getById);

// Warehouse and Admin can create & update products and upload photos
router.post(
  '/',
  requireRole(Role.WAREHOUSE),
  validateRequest(productSchema),
  ProductController.create
);

router.put(
  '/:id',
  requireRole(Role.WAREHOUSE),
  validateRequest(productUpdateSchema),
  ProductController.update
);

router.post(
  '/:id/image',
  requireRole(Role.WAREHOUSE),
  upload.single('image'),
  ProductController.uploadImage
);

export default router;
