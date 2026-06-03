import { z } from 'zod';

export const createEditRequestSchema = z.object({
  transactionId: z.string().uuid().optional(),
  expenseId: z.string().uuid().optional(),
  settlementId: z.string().uuid().optional(),
  resourceType: z.enum(['TRANSACTION', 'EXPENSE', 'SETTLEMENT']).default('TRANSACTION'),
  requestReason: z.string().min(5, 'Request reason must be at least 5 characters'),
  proposedChanges: z.record(z.unknown()).default({}),
}).refine((d) => d.transactionId || d.expenseId || d.settlementId, {
  message: 'Either transactionId, expenseId, or settlementId must be provided',
});

export const reviewEditRequestSchema = z.object({
  reviewNotes: z.string().optional(),
});

export const editRequestFiltersSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
});

export type CreateEditRequestDto = z.infer<typeof createEditRequestSchema>;
export type ReviewEditRequestDto = z.infer<typeof reviewEditRequestSchema>;
export type EditRequestFiltersDto = z.infer<typeof editRequestFiltersSchema>;
