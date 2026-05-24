import { z } from 'zod';

export const createSettlementSchema = z.object({
  centerId: z.string().uuid(),
  settlementDate: z.string(),
  carryForwardAmount: z.number().default(0),
  settledAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const settlementFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['settlementDate', 'totalIncome', 'netAmount']).default('settlementDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
});

export type CreateSettlementDto = z.infer<typeof createSettlementSchema>;
export type SettlementFiltersDto = z.infer<typeof settlementFiltersSchema>;
