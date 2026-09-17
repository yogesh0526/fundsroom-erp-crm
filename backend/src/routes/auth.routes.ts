import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { loginSchema } from '../validations';

const router = Router();

router.post('/login', validateRequest(loginSchema), AuthController.login);
router.get('/me', authenticateToken, AuthController.me);

export default router;
