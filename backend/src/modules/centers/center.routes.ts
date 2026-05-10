import { Router } from 'express';
import { CenterController } from './center.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const centerController = new CenterController();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', centerController.findAll);
router.post('/', centerController.create);
router.get('/:id', centerController.findById);
router.put('/:id', centerController.update);
router.delete('/:id', centerController.delete);

export default router;
