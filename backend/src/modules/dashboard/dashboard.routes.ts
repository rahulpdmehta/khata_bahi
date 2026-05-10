import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const dashboardController = new DashboardController();

router.use(authenticate);

router.get('/overview', dashboardController.getOverview);
router.get('/income-vs-expense-trend', dashboardController.getIncomeVsExpenseTrend);
router.get('/center-performance', dashboardController.getCenterPerformance);
router.get('/expense-breakdown', dashboardController.getExpenseBreakdown);
router.get('/settlement-due', dashboardController.getSettlementDue);
router.get('/payment-mode-breakdown', dashboardController.getPaymentModeBreakdown);

export default router;
