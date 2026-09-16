import { Router } from 'express';
import { DispatchController } from '../controllers/dispatch.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.get('/', authenticateToken, DispatchController.getDispatches);
router.get('/:id', authenticateToken, DispatchController.getDispatchById);

export default router;
