import { Response } from 'express';
import { z } from 'zod';
import { MasterDataService } from './masterData.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { AuthRequest } from '../../middleware/auth';

const masterDataService = new MasterDataService();

const createIncomeSourceSchema = z.object({
  sourceName: z.string().min(1, 'Source name is required'),
  sourceCode: z.string().min(1, 'Source code is required'),
  defaultAmount: z.number().nonnegative(),
});

const createVehicleTypeSchema = z.object({
  typeName: z.string().min(1, 'Type name is required'),
  typeCode: z.string().min(1, 'Type code is required'),
  baseCharge: z.number().nonnegative(),
});

const updateIncomeSourceSchema = createIncomeSourceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const updateVehicleTypeSchema = createVehicleTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export class MasterDataController {
  getIncomeSources = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const result = await masterDataService.getIncomeSources();
    res.json(ApiResponse.success(result));
  });

  getVehicleTypes = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const result = await masterDataService.getVehicleTypes();
    res.json(ApiResponse.success(result));
  });

  createIncomeSource = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createIncomeSourceSchema.parse(req.body);
    const result = await masterDataService.createIncomeSource(validatedData);
    res.status(201).json(ApiResponse.success(result, 'Income source created successfully', 201));
  });

  createVehicleType = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createVehicleTypeSchema.parse(req.body);
    const result = await masterDataService.createVehicleType(validatedData);
    res.status(201).json(ApiResponse.success(result, 'Vehicle type created successfully', 201));
  });

  updateIncomeSource = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = updateIncomeSourceSchema.parse(req.body);
    const result = await masterDataService.updateIncomeSource(req.params.id, validatedData);
    res.json(ApiResponse.success(result, 'Income source updated successfully'));
  });

  updateVehicleType = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = updateVehicleTypeSchema.parse(req.body);
    const result = await masterDataService.updateVehicleType(req.params.id, validatedData);
    res.json(ApiResponse.success(result, 'Vehicle type updated successfully'));
  });
}
