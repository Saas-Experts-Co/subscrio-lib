import { z } from 'zod';

export const CreateAPIKeyDtoSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(255, 'Display name too long'),
  description: z.string().max(1000).optional(),
  scope: z.enum(['admin', 'readonly']),
  expiresAt: z.string().datetime().or(z.date()).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  createdBy: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type CreateAPIKeyDto = z.infer<typeof CreateAPIKeyDtoSchema>;

export const UpdateAPIKeyDtoSchema = CreateAPIKeyDtoSchema.partial();
export type UpdateAPIKeyDto = z.infer<typeof UpdateAPIKeyDtoSchema>;

export interface APIKeyDto {
  key: string;
  displayName: string;
  description?: string | null;
  status: string;
  scope: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  ipWhitelist?: string[] | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface APIKeyWithPlaintextDto extends APIKeyDto {
  plaintextKey: string;
}

export const APIKeyFilterDtoSchema = z.object({
  status: z.enum(['active', 'revoked']).optional(),
  scope: z.enum(['admin', 'readonly']).optional(),
  createdBy: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['displayName', 'lastUsedAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

export type APIKeyFilterDto = z.infer<typeof APIKeyFilterDtoSchema>;

