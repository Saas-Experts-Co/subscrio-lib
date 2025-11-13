import { pgTable, text, integer, timestamp, jsonb, boolean, unique, bigserial, bigint } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: text('key').notNull().unique(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

export const features = pgTable('features', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: text('key').notNull().unique(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  value_type: text('value_type').notNull(),
  default_value: text('default_value').notNull(),
  group_name: text('group_name'),
  status: text('status').notNull(),
  validator: jsonb('validator'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

export const product_features = pgTable('product_features', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  product_id: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  feature_id: bigint('feature_id', { mode: 'number' }).notNull().references(() => features.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  uniqueProductFeature: unique().on(table.product_id, table.feature_id)
}));

export const plans = pgTable('plans', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  product_id: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  // Note: on_expire_transition_to_billing_cycle_id FK is added manually in installer.ts to handle circular dependency
  on_expire_transition_to_billing_cycle_id: bigint('on_expire_transition_to_billing_cycle_id', { mode: 'number' }),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  uniqueProductKey: unique().on(table.product_id, table.key)
}));

export const plan_features = pgTable('plan_features', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  plan_id: bigint('plan_id', { mode: 'number' }).notNull().references(() => plans.id, { onDelete: 'cascade' }),
  feature_id: bigint('feature_id', { mode: 'number' }).notNull().references(() => features.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  uniquePlanFeature: unique().on(table.plan_id, table.feature_id)
}));


export const customers = pgTable('customers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: text('key').notNull().unique(),
  display_name: text('display_name'),
  email: text('email'),
  external_billing_id: text('external_billing_id').unique(),
  status: text('status').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

export const api_keys = pgTable('api_keys', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: text('key').notNull().unique(),  // External reference key
  key_hash: text('key_hash').notNull().unique(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  scope: text('scope').notNull(),
  expires_at: timestamp('expires_at'),
  last_used_at: timestamp('last_used_at'),
  ip_whitelist: jsonb('ip_whitelist'),
  created_by: text('created_by'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

export const subscriptions = pgTable('subscriptions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: text('key').notNull().unique(),  // External reference key
  customer_id: bigint('customer_id', { mode: 'number' }).notNull().references(() => customers.id, { onDelete: 'cascade' }),
  plan_id: bigint('plan_id', { mode: 'number' }).notNull().references(() => plans.id, { onDelete: 'cascade' }),
  billing_cycle_id: bigint('billing_cycle_id', { mode: 'number' }).notNull().references(() => billing_cycles.id, { onDelete: 'cascade' }),
  activation_date: timestamp('activation_date'),
  expiration_date: timestamp('expiration_date'),
  cancellation_date: timestamp('cancellation_date'),
  trial_end_date: timestamp('trial_end_date'),
  current_period_start: timestamp('current_period_start'),
  current_period_end: timestamp('current_period_end'),
  stripe_subscription_id: text('stripe_subscription_id').unique(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  status: text('status').notNull().default('active'),
  is_archived: boolean('is_archived').notNull().default(false)
});

export const subscription_feature_overrides = pgTable('subscription_feature_overrides', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  subscription_id: bigint('subscription_id', { mode: 'number' }).notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  feature_id: bigint('feature_id', { mode: 'number' }).notNull().references(() => features.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  override_type: text('override_type').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  uniqueSubscriptionFeature: unique().on(table.subscription_id, table.feature_id)
}));

export const billing_cycles = pgTable('billing_cycles', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  plan_id: bigint('plan_id', { mode: 'number' }).notNull().references(() => plans.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  duration_value: integer('duration_value'),
  duration_unit: text('duration_unit').notNull(),
  external_product_id: text('external_product_id'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  uniquePlanKey: unique().on(table.plan_id, table.key)
}));

export const system_config = pgTable('system_config', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  config_key: text('config_key').notNull().unique(),
  config_value: text('config_value').notNull(),
  encrypted: boolean('encrypted').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

