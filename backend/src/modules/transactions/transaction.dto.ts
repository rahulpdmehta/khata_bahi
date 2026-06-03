import { z } from 'zod';
import { PAYMENT_MODES, TRANSACTION_PAYMENT_MODES } from '../../constants/paymentModes';

const splitPaymentSchema = z.object({
  paymentMode: z.enum(PAYMENT_MODES),
  amount: z.number().positive(),
});

const createTransactionBase = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  vehicleTypeId: z.string().uuid(),
  incomeSourceId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  centerId: z.string().uuid(),
  paymentMode: z.enum(TRANSACTION_PAYMENT_MODES).default('CASH'),
  splitPayments: z.array(splitPaymentSchema).optional(),
  customerName: z.string().max(100).optional(),
  customerMobile: z.string().max(15).optional(),
  notes: z.string().optional(),
  transactionDate: z.string(),
});

// When split payments are present, they must sum to the transaction amount
// (otherwise cash-income / settlement math is corrupted).
export const createTransactionSchema = createTransactionBase.refine(
  (data) => {
    if (!data.splitPayments || data.splitPayments.length === 0) return true;
    const sum = data.splitPayments.reduce((s, p) => s + p.amount, 0);
    return Math.abs(sum - data.amount) < 0.01;
  },
  { message: 'Split payment amounts must sum to the transaction amount', path: ['splitPayments'] }
);

export const updateTransactionSchema = createTransactionBase.partial();

export const transactionFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  vehicleTypeId: z.string().uuid().optional(),
  incomeSourceId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['transactionDate', 'amount']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
export type TransactionFiltersDto = z.infer<typeof transactionFiltersSchema>;
