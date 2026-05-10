import { z } from 'zod';

export const createCenterSchema = z.object({
  centerCode: z.string().min(1, 'Center code is required'),
  centerName: z.string().min(1, 'Center name is required'),
  address: z.string().min(1, 'Address is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  email: z.string().email().optional(),
});

export const updateCenterSchema = createCenterSchema.partial();

export const centerFiltersSchema = z.object({
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
});

export type CreateCenterDto = z.infer<typeof createCenterSchema>;
export type UpdateCenterDto = z.infer<typeof updateCenterSchema>;
export type CenterFiltersDto = z.infer<typeof centerFiltersSchema>;
