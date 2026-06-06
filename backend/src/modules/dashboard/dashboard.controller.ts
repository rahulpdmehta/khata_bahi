import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { subDays } from 'date-fns';
import { AuthRequest } from '../../middleware/auth';

const dashboardService = new DashboardService();

// transactionDate/expenseDate are @db.Date (date-only). Build day windows in UTC so the
// date part stays correct regardless of server timezone (a local-midnight window in IST
// shifts to the previous day and wrongly pulls in its records).
const utcStartOfDay = (dt: Date): Date =>
  new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
const utcEndOfDay = (dt: Date): Date =>
  new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999));

function parseDateRange(query: Record<string, unknown>): { startDate: Date; endDate: Date } {
  const today = new Date();
  const days = query.days !== undefined ? Number(query.days) : undefined;

  if (query.startDate && query.endDate) {
    return {
      startDate: utcStartOfDay(new Date(query.startDate as string)),
      endDate: utcEndOfDay(new Date(query.endDate as string)),
    };
  }

  const d = days ?? 29;
  return {
    startDate: utcStartOfDay(subDays(today, d)),
    endDate: utcEndOfDay(today),
  };
}

export class DashboardController {
  getOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId } = req.query;
    const result = await dashboardService.getOverview(
      req.user!.userId,
      req.user!.role,
      centerId as string | undefined
    );
    res.json(ApiResponse.success(result));
  });

  getIncomeVsExpenseTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId } = req.query;
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const result = await dashboardService.getIncomeVsExpenseTrend(
      req.user!.userId,
      req.user!.role,
      startDate,
      endDate,
      centerId as string | undefined
    );
    res.json(ApiResponse.success(result));
  });

  getCenterPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const result = await dashboardService.getCenterPerformance(
      req.user!.userId,
      req.user!.role,
      startDate,
      endDate
    );
    res.json(ApiResponse.success(result));
  });

  getExpenseBreakdown = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId } = req.query;
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const result = await dashboardService.getExpenseBreakdown(
      req.user!.userId,
      req.user!.role,
      startDate,
      endDate,
      centerId as string | undefined
    );
    res.json(ApiResponse.success(result));
  });

  getSettlementDue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId } = req.query;
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const result = await dashboardService.getSettlementDue(
      req.user!.userId,
      req.user!.role,
      startDate,
      endDate,
      centerId as string | undefined
    );
    res.json(ApiResponse.success(result));
  });

  getPaymentModeBreakdown = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId } = req.query;
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const result = await dashboardService.getPaymentModeBreakdown(
      req.user!.userId,
      req.user!.role,
      startDate,
      endDate,
      centerId as string | undefined
    );
    res.json(ApiResponse.success(result));
  });

  getHourlyDistribution = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId } = req.query;
    const { startDate, endDate } = parseDateRange(req.query as Record<string, unknown>);
    const result = await dashboardService.getHourlyDistribution(
      req.user!.userId,
      req.user!.role,
      startDate,
      endDate,
      centerId as string | undefined
    );
    res.json(ApiResponse.success(result));
  });

  getSettlementTotals = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId } = req.query;
    const result = await dashboardService.getSettlementTotals(
      req.user!.userId,
      req.user!.role,
      centerId as string | undefined
    );
    res.json(ApiResponse.success(result));
  });
}
