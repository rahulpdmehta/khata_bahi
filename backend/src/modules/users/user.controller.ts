import { Response } from 'express';
import { UserService } from './user.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { createUserSchema, updateUserSchema, userFiltersSchema } from './user.dto';
import { AuthRequest } from '../../middleware/auth';

const userService = new UserService();

export class UserController {
  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = userFiltersSchema.parse(req.query);
    const result = await userService.findAll(filters);
    res.json(ApiResponse.success(result));
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await userService.findById(req.params.id);
    res.json(ApiResponse.success(result));
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createUserSchema.parse(req.body);
    const result = await userService.create(validatedData);
    res.status(201).json(ApiResponse.success(result, 'User created successfully', 201));
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = updateUserSchema.parse(req.body);
    const result = await userService.update(req.params.id, validatedData);
    res.json(ApiResponse.success(result, 'User updated successfully'));
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await userService.delete(req.params.id);
    res.json(ApiResponse.success(result, 'User deleted successfully'));
  });

  toggleStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await userService.toggleStatus(req.params.id);
    res.json(ApiResponse.success(result, 'User status toggled successfully'));
  });
}
