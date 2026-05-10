import { Response } from 'express';
import { TransactionService } from './transaction.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
} from './transaction.dto';
import { AuthRequest } from '../../middleware/auth';

const transactionService = new TransactionService();

export class TransactionController {
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createTransactionSchema.parse(req.body);
    const result = await transactionService.create(req.user!.userId, req.user!.role, validatedData);
    res.status(201).json(ApiResponse.success(result, 'Transaction created successfully', 201));
  });

  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = transactionFiltersSchema.parse(req.query);
    const result = await transactionService.findAll(req.user!.userId, req.user!.role, filters);
    res.json(ApiResponse.success(result));
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await transactionService.findById(req.params.id);
    res.json(ApiResponse.success(result));
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = updateTransactionSchema.parse(req.body);
    const result = await transactionService.update(req.params.id, validatedData, req.user!.userId);
    res.json(ApiResponse.success(result, 'Transaction updated successfully'));
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await transactionService.delete(req.params.id);
    res.json(ApiResponse.success(result, 'Transaction deleted successfully'));
  });

  getMyEntries = asyncHandler(async (req: AuthRequest, res: Response) => {
    const date = req.query.date as string | undefined;
    const result = await transactionService.getMyEntries(req.user!.userId, date);
    res.json(ApiResponse.success(result));
  });
}
