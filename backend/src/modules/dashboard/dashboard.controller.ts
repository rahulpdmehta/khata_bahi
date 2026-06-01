import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { AuthRequest } from '../../middleware/auth';

const dashboardService = new DashboardService();

function parseDateRange(query: Record<string, unknown>): { startDate: Date; endDate: Date } {
  const today = new Date();
  const days = query.days !== undefined ? Number(query.days) : undefined;

  if (query.startDate && query.endDate) {
    return {
      startDate: startOfDay(new Date(query.startDate as string)),
      endDate: endOfDay(new Date(query.endDate as string)),
    };
  }

  const d = days ?? 29;
  return {
    startDate: startOfDay(subDays(today, d)),
    endDate: endOfDay(today),
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
