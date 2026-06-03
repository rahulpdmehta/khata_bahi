import { z } from 'zod';
import { PAYMENT_MODES } from '../../constants/paymentModes';

export const createExpenseSchema = z.object({
  centerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(PAYMENT_MODES),
  vendorName: z.string().optional(),
  description: z.string().optional(),
  expenseDate: z.string(),
  receiptUrl: z.string().url().optional(),
});

export const approveExpenseSchema = z.object({
  expenseId: z.string().uuid(),
});

export const rejectExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

export const expenseFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['expenseDate', 'amount']).default('expenseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type ApproveExpenseDto = z.infer<typeof approveExpenseSchema>;
export type RejectExpenseDto = z.infer<typeof rejectExpenseSchema>;
export type ExpenseFiltersDto = z.infer<typeof expenseFiltersSchema>;
