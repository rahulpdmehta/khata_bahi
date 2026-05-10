import { Response } from 'express';
import { CenterService } from './center.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { createCenterSchema, updateCenterSchema, centerFiltersSchema } from './center.dto';
import { AuthRequest } from '../../middleware/auth';

const centerService = new CenterService();

export class CenterController {
  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = centerFiltersSchema.parse(req.query);
    const result = await centerService.findAll(filters);
    res.json(ApiResponse.success(result));
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await centerService.findById(req.params.id);
    res.json(ApiResponse.success(result));
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createCenterSchema.parse(req.body);
    const result = await centerService.create(validatedData);
    res.status(201).json(ApiResponse.success(result, 'Center created successfully', 201));
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = updateCenterSchema.parse(req.body);
    const result = await centerService.update(req.params.id, validatedData);
    res.json(ApiResponse.success(result, 'Center updated successfully'));
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await centerService.delete(req.params.id);
    res.json(ApiResponse.success(result, 'Center deleted successfully'));
  });
}
