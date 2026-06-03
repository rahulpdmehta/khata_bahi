import { z } from 'zod';

export const createSettlementSchema = z.object({
  centerId: z.string().uuid(),
  settlementDate: z.string(),
  settledAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const batchPreviewQuerySchema = z.object({
  centerId: z.string().uuid(),
  endDate: z.string(),
});

export const createBatchSettlementSchema = z.object({
  centerId: z.string().uuid(),
  endDate: z.string(),
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
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
  // When 'true', return individual settlements without batch grouping (used by reports)
  flat: z.enum(['true', 'false']).optional(),
});

export type CreateSettlementDto = z.infer<typeof createSettlementSchema>;
export type BatchPreviewQueryDto = z.infer<typeof batchPreviewQuerySchema>;
export type CreateBatchSettlementDto = z.infer<typeof createBatchSettlementSchema>;
export type SettlementFiltersDto = z.infer<typeof settlementFiltersSchema>;
