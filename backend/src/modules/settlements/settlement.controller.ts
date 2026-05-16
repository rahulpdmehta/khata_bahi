import { Response } from 'express';
import { SettlementService } from './settlement.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { createSettlementSchema, settlementFiltersSchema } from './settlement.dto';
import { AuthRequest } from '../../middleware/auth';

const settlementService = new SettlementService();

export class SettlementController {
  preview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { centerId, settlementDate } = req.query as { centerId: string; settlementDate: string };
    const result = await settlementService.preview(
      req.user!.userId,
      req.user!.role,
      centerId,
      settlementDate
    );
    res.json(ApiResponse.success(result));
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createSettlementSchema.parse(req.body);
    const result = await settlementService.create(req.user!.userId, req.user!.role, validatedData);
    res.status(201).json(ApiResponse.success(result, 'Settlement created successfully', 201));
  });

  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = settlementFiltersSchema.parse(req.query);
    const result = await settlementService.findAll(req.user!.userId, req.user!.role, filters);
    res.json(ApiResponse.success(result));
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await settlementService.findById(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.json(ApiResponse.success(result));
  });

  approve = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await settlementService.approve(req.params.id, req.user!.userId);
    res.json(ApiResponse.success(result, 'Settlement approved successfully'));
  });

  reject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await settlementService.reject(req.params.id, req.user!.userId, req.body.notes || '');
    res.json(ApiResponse.success(result, 'Settlement rejected'));
  });

  deleteSettlement = asyncHandler(async (req: AuthRequest, res: Response) => {
    await settlementService.deleteSettlement(req.params.id);
    res.json(ApiResponse.success(null, 'Settlement deleted'));
  });
}
