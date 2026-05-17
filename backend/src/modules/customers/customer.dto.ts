// backend/src/modules/customers/customer.dto.ts
import { z } from 'zod';

export const customerFiltersSchema = z.object({
  search: z.string().optional(),
  centerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['totalSpent', 'totalVisits', 'lastVisit']).default('lastVisit'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const customerDetailFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export type CustomerFiltersDto = z.infer<typeof customerFiltersSchema>;
export type CustomerDetailFiltersDto = z.infer<typeof customerDetailFiltersSchema>;
