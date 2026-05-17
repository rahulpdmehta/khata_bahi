import { Router } from 'express';
import { CustomerController } from './customer.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const customerController = new CustomerController();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', customerController.findAll);
router.get('/:mobile', customerController.findByMobile);

export default router;
