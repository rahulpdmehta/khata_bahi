import { Router } from 'express';
import { MasterDataController } from './masterData.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();
const masterDataController = new MasterDataController();

router.get('/income-sources', authenticate, masterDataController.getIncomeSources);
router.get('/vehicle-types', authenticate, masterDataController.getVehicleTypes);
router.post('/income-sources', authenticate, requireRole('ADMIN'), masterDataController.createIncomeSource);
router.post('/vehicle-types', authenticate, requireRole('ADMIN'), masterDataController.createVehicleType);
router.put('/income-sources/:id', authenticate, requireRole('ADMIN'), masterDataController.updateIncomeSource);
router.put('/vehicle-types/:id', authenticate, requireRole('ADMIN'), masterDataController.updateVehicleType);

export default router;
