import { Router } from 'express';
import { EditRequestController } from './editRequest.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const editRequestController = new EditRequestController();

router.post('/', authenticate, editRequestController.create);
router.get('/', authenticate, editRequestController.findAll);
router.get('/:id', authenticate, editRequestController.findById);
router.put('/:id/approve', authenticate, requireRole('ADMIN'), editRequestController.approve);
router.put('/:id/reject', authenticate, requireRole('ADMIN'), editRequestController.reject);

export default router;
