import { z } from 'zod';

// Helper to transform empty strings to undefined for optional date fields
const optionalDateField = () =>
  z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.union([z.string().datetime(), z.date()]).optional()
  );

export const CreateSubscriptionDtoSchema = z.object({
  key: z.string()
    .min(1, 'Subscription key is required')
    .max(255, 'Subscription key too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Subscription key must be alphanumeric with hyphens/underscores'),
  customerKey: z.string().min(1, 'Customer key is required'),
  billingCycleKey: z.string()
    .min(1, 'Billing cycle key is required')
    .regex(/^[a-z0-9-]+$/, 'Billing cycle key must be lowercase alphanumeric with hyphens'),
  activationDate: optionalDateField(),
  expirationDate: optionalDateField(),
  cancellationDate: optionalDateField(),
  trialEndDate: optionalDateField(),
  currentPeriodStart: optionalDateField(),
  currentPeriodEnd: optionalDateField(),
  autoRenew: z.boolean().default(true),
  stripeSubscriptionId: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().optional()
  ),
  metadata: z.record(z.unknown()).optional()
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionDtoSchema>;

export const UpdateSubscriptionDtoSchema = CreateSubscriptionDtoSchema.partial();
export type UpdateSubscriptionDto = z.infer<typeof UpdateSubscriptionDtoSchema>;

export interface SubscriptionDto {
  key: string;
  customerKey: string;
  productKey: string;
  planKey: string;
  billingCycleKey: string;
  status: string;
  activationDate?: string;
  expirationDate?: string;
  cancellationDate?: string;
  trialEndDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  autoRenew: boolean;
  stripeSubscriptionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const SubscriptionFilterDtoSchema = z.object({
  customerKey: z.string().optional(),
  productKey: z.string().optional(),
  planKey: z.string().optional(),
  status: z.enum(['pending', 'active', 'trial', 'cancelled', 'expired', 'suspended']).optional(),
  sortBy: z.enum(['activationDate', 'expirationDate', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0)
});

export type SubscriptionFilterDto = z.infer<typeof SubscriptionFilterDtoSchema>;

