import { Router } from 'express';
import { ExpenseController } from './expense.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const expenseController = new ExpenseController();

router.use(authenticate);

router.post('/', expenseController.create);
router.get('/', expenseController.findAll);
router.post('/approve', requireRole('ADMIN'), expenseController.approve);
router.post('/reject', requireRole('ADMIN'), expenseController.reject);
router.get('/categories', expenseController.getCategories);
router.put('/:id', requireRole('ADMIN'), expenseController.updateExpense);
router.delete('/:id', requireRole('ADMIN'), expenseController.deleteExpense);

export default router;
