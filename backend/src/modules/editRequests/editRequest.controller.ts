import { Response } from 'express';
import { EditRequestService } from './editRequest.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  createEditRequestSchema,
  reviewEditRequestSchema,
  editRequestFiltersSchema,
} from './editRequest.dto';
import { AuthRequest } from '../../middleware/auth';

const editRequestService = new EditRequestService();

export class EditRequestController {
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createEditRequestSchema.parse(req.body);
    const result = await editRequestService.create(req.user!.userId, validatedData);
    res.status(201).json(ApiResponse.success(result, 'Edit request created successfully', 201));
  });

  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = editRequestFiltersSchema.parse(req.query);
    const result = await editRequestService.findAll(req.user!.userId, req.user!.role, filters);
    res.json(ApiResponse.success(result));
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await editRequestService.findById(req.params.id);
    res.json(ApiResponse.success(result));
  });

  approve = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reviewNotes } = reviewEditRequestSchema.parse(req.body);
    const result = await editRequestService.approve(req.params.id, req.user!.userId, reviewNotes);
    res.json(ApiResponse.success(result, 'Edit request approved successfully'));
  });

  reject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reviewNotes } = reviewEditRequestSchema.parse(req.body);
    const result = await editRequestService.reject(req.params.id, req.user!.userId, reviewNotes);
    res.json(ApiResponse.success(result, 'Edit request rejected'));
  });
}
