import { Router } from 'express';
import { SettlementController } from './settlement.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const settlementController = new SettlementController();

router.get('/preview', authenticate, settlementController.preview);
router.get('/batch-preview', authenticate, settlementController.batchPreview);
router.post('/batch', authenticate, settlementController.createBatch);
router.post('/', authenticate, settlementController.create);
router.get('/', authenticate, settlementController.findAll);
router.get('/:id', authenticate, settlementController.findById);
router.put('/:id/approve', authenticate, requireRole('ADMIN'), settlementController.approve);
router.put('/:id/reject', authenticate, requireRole('ADMIN'), settlementController.reject);
router.delete('/:id', authenticate, requireRole('ADMIN'), settlementController.deleteSettlement);

export default router;
