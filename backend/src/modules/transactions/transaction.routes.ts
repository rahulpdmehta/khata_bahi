import { Router } from 'express';
import { TransactionController } from './transaction.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const transactionController = new TransactionController();

router.get('/my-entries', authenticate, transactionController.getMyEntries);
router.post('/', authenticate, transactionController.create);
router.get('/', authenticate, transactionController.findAll);
router.get('/:id', authenticate, transactionController.findById);
router.put('/:id', authenticate, requireRole('ADMIN'), transactionController.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), transactionController.delete);

export default router;
