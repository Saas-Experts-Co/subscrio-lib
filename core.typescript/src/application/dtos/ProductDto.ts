import { z } from 'zod';

export const CreateProductDtoSchema = z.object({
  key: z.string()
    .min(1, 'Key is required')
    .max(255, 'Key too long')
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase alphanumeric with hyphens'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(255, 'Display name too long'),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type CreateProductDto = z.infer<typeof CreateProductDtoSchema>;

export const UpdateProductDtoSchema = CreateProductDtoSchema.partial();
export type UpdateProductDto = z.infer<typeof UpdateProductDtoSchema>;

export interface ProductDto {
  key: string;
  displayName: string;
  description?: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const ProductFilterDtoSchema = z.object({
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['displayName', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type ProductFilterDto = z.infer<typeof ProductFilterDtoSchema>;

