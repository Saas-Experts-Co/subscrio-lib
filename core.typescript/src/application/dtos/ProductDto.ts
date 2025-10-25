import { z } from 'zod';
import { MAX_KEY_LENGTH, MIN_KEY_LENGTH, MAX_DISPLAY_NAME_LENGTH, MIN_DISPLAY_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from '../constants/index.js';

export const CreateProductDtoSchema = z.object({
  key: z.string()
    .min(MIN_KEY_LENGTH, 'Key is required')
    .max(MAX_KEY_LENGTH, `Key too long (max ${MAX_KEY_LENGTH} characters)`)
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase alphanumeric with hyphens'),
  displayName: z.string()
    .min(MIN_DISPLAY_NAME_LENGTH, 'Display name is required')
    .max(MAX_DISPLAY_NAME_LENGTH, `Display name too long (max ${MAX_DISPLAY_NAME_LENGTH} characters)`),
  description: z.string().max(MAX_DESCRIPTION_LENGTH, `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type CreateProductDto = z.infer<typeof CreateProductDtoSchema>;

export const UpdateProductDtoSchema = z.object({
  // Only updateable fields - excluding immutable field: key
  displayName: z.string()
    .min(MIN_DISPLAY_NAME_LENGTH, 'Display name is required')
    .max(MAX_DISPLAY_NAME_LENGTH, `Display name too long (max ${MAX_DISPLAY_NAME_LENGTH} characters)`)
    .optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH, `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`).optional(),
  metadata: z.record(z.unknown()).optional()
});
export type UpdateProductDto = z.infer<typeof UpdateProductDtoSchema>;

export interface ProductDto {
  key: string;
  displayName: string;
  description?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
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

