import { z } from 'zod';

const splitPaymentSchema = z.object({
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DUES']),
  amount: z.number().positive(),
});

export const createTransactionSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  vehicleTypeId: z.string().uuid(),
  incomeSourceId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  centerId: z.string().uuid(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DUES', 'SPLIT']).default('CASH'),
  splitPayments: z.array(splitPaymentSchema).optional(),
  customerName: z.string().max(100).optional(),
  customerMobile: z.string().max(15).optional(),
  notes: z.string().optional(),
  transactionDate: z.string(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  vehicleTypeId: z.string().uuid().optional(),
  incomeSourceId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['transactionDate', 'amount']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
export type TransactionFiltersDto = z.infer<typeof transactionFiltersSchema>;
