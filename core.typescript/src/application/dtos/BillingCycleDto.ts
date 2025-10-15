import { z } from 'zod';

export const CreateBillingCycleDtoSchema = z.object({
  productKey: z.string()
    .min(1, 'Product key is required')
    .regex(/^[a-z0-9-]+$/, 'Product key must be lowercase alphanumeric with hyphens'),
  planKey: z.string()
    .min(1, 'Plan key is required')
    .regex(/^[a-z0-9-]+$/, 'Plan key must be lowercase alphanumeric with hyphens'),
  key: z.string()
    .min(1, 'Key is required')
    .max(255, 'Key too long')
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase alphanumeric with hyphens'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(255, 'Display name too long'),
  description: z.string().max(1000).optional(),
  durationValue: z.number().int().min(1, 'Duration value must be positive'),
  durationUnit: z.enum(['days', 'weeks', 'months', 'years']),
  externalProductId: z.string().max(255).optional()
});

export type CreateBillingCycleDto = z.infer<typeof CreateBillingCycleDtoSchema>;

export const UpdateBillingCycleDtoSchema = CreateBillingCycleDtoSchema.omit({ 
  productKey: true, 
  planKey: true, 
  key: true 
}).partial();
export type UpdateBillingCycleDto = z.infer<typeof UpdateBillingCycleDtoSchema>;

export interface BillingCycleDto {
  productKey: string;
  planKey: string;
  key: string;
  displayName: string;
  description?: string;
  durationValue: number;
  durationUnit: string;
  externalProductId?: string;
  createdAt: string;
  updatedAt: string;
}

export const BillingCycleFilterDtoSchema = z.object({
  productKey: z.string().optional(),
  planKey: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  durationUnit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['displayName', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export type BillingCycleFilterDto = z.infer<typeof BillingCycleFilterDtoSchema>;

