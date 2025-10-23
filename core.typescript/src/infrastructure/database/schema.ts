import { pgTable, text, integer, timestamp, jsonb, boolean, unique, uuid } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  key: text('key').notNull().unique(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

export const features = pgTable('features', {
  id: uuid('id').primaryKey(),
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
  id: uuid('id').primaryKey(),
  product_id: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  feature_id: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  uniqueProductFeature: unique().on(table.product_id, table.feature_id)
}));

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey(),
  product_key: text('product_key').notNull(),
  key: text('key').notNull(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  default_renewal_cycle_id: uuid('default_renewal_cycle_id'),
  on_expire_transition_to_plan_id: uuid('on_expire_transition_to_plan_id'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  uniqueProductKey: unique().on(table.product_key, table.key)
}));

export const plan_features = pgTable('plan_features', {
  id: uuid('id').primaryKey(),
  plan_id: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  feature_id: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  uniquePlanFeature: unique().on(table.plan_id, table.feature_id)
}));


export const customers = pgTable('customers', {
  id: uuid('id').primaryKey(),
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
  id: uuid('id').primaryKey(),
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
  id: uuid('id').primaryKey(),
  key: text('key').notNull().unique(),  // External reference key
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  plan_id: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  billing_cycle_id: uuid('billing_cycle_id').notNull().references(() => billing_cycles.id, { onDelete: 'cascade' }),
  activation_date: timestamp('activation_date'),
  expiration_date: timestamp('expiration_date'),
  cancellation_date: timestamp('cancellation_date'),
  trial_end_date: timestamp('trial_end_date'),
  current_period_start: timestamp('current_period_start'),
  current_period_end: timestamp('current_period_end'),
  auto_renew: boolean('auto_renew').notNull().default(true),
  stripe_subscription_id: text('stripe_subscription_id').unique(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  status: text('status').notNull().default('active')
});

export const subscription_feature_overrides = pgTable('subscription_feature_overrides', {
  id: uuid('id').primaryKey(),
  subscription_id: uuid('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  feature_id: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  override_type: text('override_type').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  uniqueSubscriptionFeature: unique().on(table.subscription_id, table.feature_id)
}));

export const billing_cycles = pgTable('billing_cycles', {
  id: uuid('id').primaryKey(),
  plan_id: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  display_name: text('display_name').notNull(),
  description: text('description'),
  duration_value: integer('duration_value').notNull(),
  duration_unit: text('duration_unit').notNull(),
  external_product_id: text('external_product_id'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  uniquePlanKey: unique().on(table.plan_id, table.key)
}));

export const system_config = pgTable('system_config', {
  id: uuid('id').primaryKey(),
  config_key: text('config_key').notNull().unique(),
  config_value: text('config_value').notNull(),
  encrypted: boolean('encrypted').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

