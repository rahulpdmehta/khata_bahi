import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const userController = new UserController();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', userController.findAll);
router.post('/', userController.create);
router.get('/:id', userController.findById);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);
router.patch('/:id/toggle-status', userController.toggleStatus);

export default router;
