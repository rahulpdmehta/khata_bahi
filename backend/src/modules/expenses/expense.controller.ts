import { Response } from 'express';
import { ExpenseService } from './expense.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../middleware/asyncHandler';
import { createExpenseSchema, approveExpenseSchema, rejectExpenseSchema, expenseFiltersSchema } from './expense.dto';
import { AuthRequest } from '../../middleware/auth';

const expenseService = new ExpenseService();

export class ExpenseController {
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createExpenseSchema.parse(req.body);
    const result = await expenseService.create(req.user!.userId, req.user!.role, validatedData);
    res.json(ApiResponse.success(result, 'Expense created successfully'));
  });

  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = expenseFiltersSchema.parse(req.query);
    const result = await expenseService.findAll(req.user!.userId, filters);
    res.json(ApiResponse.success(result));
  });

  approve = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { expenseId } = approveExpenseSchema.parse(req.body);
    const result = await expenseService.approve(req.user!.userId, expenseId);
    res.json(ApiResponse.success(result, 'Expense approved successfully'));
  });

  reject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { expenseId, rejectionReason } = rejectExpenseSchema.parse(req.body);
    const result = await expenseService.reject(req.user!.userId, expenseId, rejectionReason);
    res.json(ApiResponse.success(result, 'Expense rejected'));
  });

  getCategories = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const result = await expenseService.getCategories();
    res.json(ApiResponse.success(result));
  });

  deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    await expenseService.deleteExpense(req.params.id);
    res.json(ApiResponse.success(null, 'Expense deleted successfully'));
  });

  updateExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await expenseService.updateExpense(req.params.id, req.body);
    res.json(ApiResponse.success(result, 'Expense updated successfully'));
  });
}
