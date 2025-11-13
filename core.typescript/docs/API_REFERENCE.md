# Subscrio Core API Reference

Complete documentation of all data structures and methods exposed by `@subscrio/core`.

## Table of Contents
- [Main Class](#main-class)
- [Service Methods](#service-methods)
- [Data Structures (DTOs)](#data-structures-dtos)
- [Key Relationships](#key-relationships)
- [Feature Resolution Hierarchy](#feature-resolution-hierarchy)
- [Important Notes](#important-notes)

---

## Main Class

### Subscrio

```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL
  }
});
```

**Public Services:**
- `subscrio.products` - ProductManagementService
- `subscrio.features` - FeatureManagementService  
- `subscrio.plans` - PlanManagementService
- `subscrio.customers` - CustomerManagementService
- `subscrio.apiKeys` - APIKeyManagementService
- `subscrio.subscriptions` - SubscriptionManagementService
- `subscrio.billingCycles` - BillingCycleManagementService
- `subscrio.featureChecker` - FeatureCheckerService
- `subscrio.stripe` - StripeIntegrationService

**Instance Methods:**
- `await subscrio.installSchema(adminPassphrase?): Promise<void>` - Install database schema
- `await subscrio.verifySchema(): Promise<boolean>` - Check if schema is installed
- `await subscrio.dropSchema(): Promise<void>` - Drop all database tables (WARNING: Destructive!)
- `await subscrio.close(): Promise<void>` - Close database connections

---

## Service Methods

### ProductManagementService (`subscrio.products`)

```typescript
// Create
createProduct(dto: CreateProductDto): Promise<ProductDto>

// Read
getProduct(key: string): Promise<ProductDto | null>
listProducts(filters?: ProductFilterDto): Promise<ProductDto[]>

// Update
updateProduct(key: string, dto: UpdateProductDto): Promise<ProductDto>
archiveProduct(key: string): Promise<ProductDto>
unarchiveProduct(key: string): Promise<ProductDto>

// Delete
deleteProduct(key: string): Promise<void>

// Feature Association
associateFeature(productKey: string, featureKey: string): Promise<void>
dissociateFeature(productKey: string, featureKey: string): Promise<void>
```

### FeatureManagementService (`subscrio.features`)

```typescript
// Create
createFeature(dto: CreateFeatureDto): Promise<FeatureDto>

// Read
getFeature(key: string): Promise<FeatureDto | null>
listFeatures(filters?: FeatureFilterDto): Promise<FeatureDto[]>
getFeaturesByProduct(productKey: string): Promise<FeatureDto[]>

// Update
updateFeature(key: string, dto: UpdateFeatureDto): Promise<FeatureDto>
archiveFeature(key: string): Promise<void>
unarchiveFeature(key: string): Promise<void>

// Delete
deleteFeature(key: string): Promise<void>
```

### PlanManagementService (`subscrio.plans`)

```typescript
// Create
createPlan(dto: CreatePlanDto): Promise<PlanDto>

// Read
getPlan(planKey: string): Promise<PlanDto | null>
listPlans(filters?: PlanFilterDto): Promise<PlanDto[]>
getPlansByProduct(productKey: string): Promise<PlanDto[]>
getPlanFeatures(planKey: string): Promise<Array<{ featureKey: string; value: string }>>
getFeatureValue(planKey: string, featureKey: string): Promise<string | null>

// Update
updatePlan(planKey: string, dto: UpdatePlanDto): Promise<PlanDto>
archivePlan(planKey: string): Promise<void>
unarchivePlan(planKey: string): Promise<void>
setFeatureValue(planKey: string, featureKey: string, value: string): Promise<void>
removeFeatureValue(planKey: string, featureKey: string): Promise<void>

// Delete
deletePlan(planKey: string): Promise<void>
```

### BillingCycleManagementService (`subscrio.billingCycles`)

```typescript
// Create
createBillingCycle(dto: CreateBillingCycleDto): Promise<BillingCycleDto>

// Read
getBillingCycle(key: string): Promise<BillingCycleDto | null>
getBillingCyclesByPlan(planKey: string): Promise<BillingCycleDto[]>
listBillingCycles(filters?: BillingCycleFilterDto): Promise<BillingCycleDto[]>
getBillingCyclesByDurationUnit(durationUnit: 'days' | 'weeks' | 'months' | 'years' | 'forever'): Promise<BillingCycleDto[]>
getDefaultBillingCycles(): Promise<BillingCycleDto[]>

// Update
updateBillingCycle(key: string, dto: UpdateBillingCycleDto): Promise<BillingCycleDto>
archiveBillingCycle(key: string): Promise<void>
unarchiveBillingCycle(key: string): Promise<void>

// Delete
deleteBillingCycle(key: string): Promise<void>

// Utility
calculateNextPeriodEnd(billingCycleKey: string, currentPeriodEnd: Date): Promise<Date | null>
```

### CustomerManagementService (`subscrio.customers`)

```typescript
// Create
createCustomer(dto: CreateCustomerDto): Promise<CustomerDto>

// Read
getCustomer(key: string): Promise<CustomerDto | null>
listCustomers(filters?: CustomerFilterDto): Promise<CustomerDto[]>

// Update
updateCustomer(key: string, dto: UpdateCustomerDto): Promise<CustomerDto>
archiveCustomer(key: string): Promise<void>
unarchiveCustomer(key: string): Promise<void>

// Delete
deleteCustomer(key: string): Promise<void>
```

### APIKeyManagementService (`subscrio.apiKeys`)

```typescript
// Create
createAPIKey(dto: CreateAPIKeyDto): Promise<APIKeyWithPlaintextDto>  // Returns plaintext key (only time available)

// Update
updateAPIKey(key: string, dto: UpdateAPIKeyDto): Promise<APIKeyDto>
archiveAPIKey(key: string): Promise<void>
unarchiveAPIKey(key: string): Promise<void>

// Delete
deleteAPIKey(key: string): Promise<void>

// Validation
validateAPIKey(
  plaintextKey: string,
  requiredScope?: 'admin' | 'readonly',
  clientIp?: string
): Promise<boolean>
getAPIKeyByPlaintext(plaintextKey: string): Promise<APIKeyDto | null>
```

### SubscriptionManagementService (`subscrio.subscriptions`)

```typescript
// Create
createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionDto>

// Read
getSubscription(subscriptionKey: string): Promise<SubscriptionDto | null>
listSubscriptions(filters?: SubscriptionFilterDto): Promise<SubscriptionDto[]>
findSubscriptions(filters: DetailedSubscriptionFilterDto): Promise<SubscriptionDto[]>
getSubscriptionsByCustomer(customerKey: string): Promise<SubscriptionDto[]>

// Update
updateSubscription(subscriptionKey: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDto>
archiveSubscription(subscriptionKey: string): Promise<void>
unarchiveSubscription(subscriptionKey: string): Promise<void>

// Delete
deleteSubscription(subscriptionKey: string): Promise<void>

// Feature Overrides
addFeatureOverride(
  subscriptionKey: string,
  featureKey: string,
  value: string,
  type?: 'permanent' | 'temporary'  // Defaults to 'permanent'
): Promise<void>
removeFeatureOverride(subscriptionKey: string, featureKey: string): Promise<void>
clearTemporaryOverrides(subscriptionKey: string): Promise<void>

// Utility
processAutomaticTransitions(): Promise<number>  // Process expired subscriptions with transition config
syncSubscriptionStatuses(limit?: number): Promise<number>  // Sync stored statuses with computed statuses
```

### FeatureCheckerService (`subscrio.featureChecker`)

**Primary API for checking features in your application:**

```typescript
// Subscription-based methods (most reliable)
getValueForSubscription<T = string>(
  subscriptionKey: string,
  featureKey: string,
  defaultValue?: T
): Promise<T | null>

isEnabledForSubscription(
  subscriptionKey: string,
  featureKey: string
): Promise<boolean>

getAllFeaturesForSubscription(
  subscriptionKey: string
): Promise<Map<string, string>>

// Customer + Product-based methods
getValueForCustomer<T = string>(
  customerKey: string,
  productKey: string,
  featureKey: string,
  defaultValue?: T
): Promise<T | null>

isEnabledForCustomer(
  customerKey: string,
  productKey: string,
  featureKey: string
): Promise<boolean>

getAllFeaturesForCustomer(
  customerKey: string,
  productKey: string
): Promise<Map<string, string>>

// Check if customer has access to a plan
hasPlanAccess(
  customerKey: string,
  productKey: string,
  planKey: string
): Promise<boolean>

// Get active plan keys for customer
getActivePlans(
  customerKey: string
): Promise<string[]>

// Get usage summary for a specific product
getFeatureUsageSummary(
  customerKey: string,
  productKey: string
): Promise<{
  activeSubscriptions: number;
  enabledFeatures: string[];
  disabledFeatures: string[];
  numericFeatures: Map<string, number>;
  textFeatures: Map<string, string>;
}>
```

### StripeIntegrationService (`subscrio.stripe`)

```typescript
// Process Stripe webhook event (after you verify signature)
processStripeEvent(event: Stripe.Event): Promise<void>

// Create Stripe subscription
createStripeSubscription(
  customerKey: string,
  planKey: string,
  billingCycleKey: string,
  stripePriceId: string
): Promise<Subscription>
```

---

## Data Structures (DTOs)

### Product

**CreateProductDto:**
```typescript
{
  key: string;                    // lowercase-with-hyphens, unique
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  metadata?: Record<string, unknown>;
}
```

**UpdateProductDto:**
```typescript
{
  displayName?: string;           // 1-255 chars
  description?: string;           // max 1000 chars
  metadata?: Record<string, unknown>;
  // Note: key is immutable
}
```

**ProductDto (Output):**
```typescript
{
  key: string;
  displayName: string;
  description?: string | null;
  status: string;                 // 'active' | 'archived'
  metadata?: Record<string, unknown> | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Feature

**CreateFeatureDto:**
```typescript
{
  key: string;                    // alphanumeric-with-hyphens/underscores, globally unique
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  valueType: 'toggle' | 'numeric' | 'text';
  defaultValue: string;           // required, validated based on valueType
  groupName?: string;             // max 255 chars
  validator?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

**UpdateFeatureDto:**
```typescript
{
  displayName?: string;           // 1-255 chars
  description?: string;           // max 1000 chars
  valueType?: 'toggle' | 'numeric' | 'text';
  defaultValue?: string;          // validated based on valueType if provided
  groupName?: string;             // max 255 chars
  validator?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  // Note: key is immutable
}
```

**FeatureDto (Output):**
```typescript
{
  key: string;
  displayName: string;
  description?: string | null;
  valueType: string;              // 'toggle' | 'numeric' | 'text'
  defaultValue: string;
  groupName?: string | null;
  status: string;                 // 'active' | 'archived'
  validator?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Plan

**CreatePlanDto:**
```typescript
{
  productKey: string;             // Key of the product
  key: string;                    // lowercase-with-hyphens, globally unique
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  onExpireTransitionToBillingCycleKey?: string; // Key of billing cycle to transition to
  metadata?: Record<string, unknown>;
}
```

**UpdatePlanDto:**
```typescript
{
  displayName?: string;           // 1-255 chars
  description?: string;           // max 1000 chars
  onExpireTransitionToBillingCycleKey?: string;
  metadata?: Record<string, unknown>;
  // Note: key and productKey are immutable
}
```

**PlanDto (Output):**
```typescript
{
  productKey: string;             // Product key
  key: string;
  displayName: string;
  description?: string | null;
  status: string;                 // 'active' | 'archived'
  onExpireTransitionToBillingCycleKey?: string | null; // Billing cycle key
  metadata?: Record<string, unknown> | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### BillingCycle

**CreateBillingCycleDto:**
```typescript
{
  planKey: string;                // Key of the plan
  key: string;                    // lowercase-with-hyphens, globally unique
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  durationValue?: number;         // integer >= 1 (required unless durationUnit is 'forever')
  durationUnit: 'days' | 'weeks' | 'months' | 'years' | 'forever';
  externalProductId?: string;     // max 255 chars (e.g., Stripe price ID)
}
```

**UpdateBillingCycleDto:**
```typescript
{
  displayName?: string;           // 1-255 chars
  description?: string;           // max 1000 chars
  durationValue?: number;         // integer >= 1 (required if durationUnit is not 'forever')
  durationUnit?: 'days' | 'weeks' | 'months' | 'years' | 'forever';
  externalProductId?: string;     // max 255 chars
  // Note: key and planKey are immutable
}
```

**BillingCycleDto (Output):**
```typescript
{
  productKey: string | null;      // Product key (resolved from plan)
  planKey: string | null;         // Plan key (resolved from plan)
  key: string;
  displayName: string;
  description?: string | null;
  status: string;                 // 'active' | 'archived'
  durationValue?: number | null;  // null for 'forever' duration
  durationUnit: string;           // 'days' | 'weeks' | 'months' | 'years' | 'forever'
  externalProductId?: string | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Customer

**CreateCustomerDto:**
```typescript
{
  key: string;                    // 1-255 chars, unique (your user ID)
  displayName?: string;           // max 255 chars
  email?: string;                 // valid email
  externalBillingId?: string;     // max 255 chars (e.g., Stripe customer ID)
  metadata?: Record<string, unknown>;
}
```

**UpdateCustomerDto:**
```typescript
{
  displayName?: string;           // max 255 chars
  email?: string;                 // valid email
  externalBillingId?: string;     // max 255 chars
  metadata?: Record<string, unknown>;
  // Note: key is immutable
}
```

**CustomerDto (Output):**
```typescript
{
  key: string;
  displayName?: string | null;
  email?: string | null;
  externalBillingId?: string | null;
  status: string;                 // 'active' | 'suspended' | 'archived' | 'deleted'
  metadata?: Record<string, unknown> | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### APIKey

**CreateAPIKeyDto:**
```typescript
{
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  scope: 'admin' | 'readonly';
  expiresAt?: string | Date;     // ISO datetime
  ipWhitelist?: string[];        // Array of IP addresses
  createdBy?: string;            // max 255 chars
  metadata?: Record<string, unknown>;
}
```

**UpdateAPIKeyDto:**
```typescript
{
  displayName?: string;           // 1-255 chars
  description?: string;           // max 1000 chars
  scope?: 'admin' | 'readonly';
  expiresAt?: string | Date;     // ISO datetime
  ipWhitelist?: string[];        // Array of IP addresses
  createdBy?: string;            // max 255 chars
  metadata?: Record<string, unknown>;
  // Note: key is immutable
}
```

**APIKeyDto (Output):**
```typescript
{
  key: string;                    // API key reference key
  displayName: string;
  description?: string | null;
  status: string;                 // 'active' | 'revoked'
  scope: string;                  // 'admin' | 'readonly'
  expiresAt?: string | null;      // ISO 8601
  lastUsedAt?: string | null;     // ISO 8601
  ipWhitelist?: string[] | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

**APIKeyWithPlaintextDto (Returned only from createAPIKey):**
```typescript
{
  ...APIKeyDto;
  plaintextKey: string;           // Plaintext API key (only available at creation)
}
```

### Subscription

**CreateSubscriptionDto:**
```typescript
{
  key: string;                    // Unique subscription key (alphanumeric with hyphens/underscores)
  customerKey: string;            // Customer's key
  billingCycleKey: string;        // Billing cycle key (required, product/plan derived from billing cycle)
  activationDate?: Date | string; // ISO datetime
  expirationDate?: Date | string; // ISO datetime
  cancellationDate?: Date | string; // ISO datetime
  trialEndDate?: Date | string;   // ISO datetime
  currentPeriodStart?: Date | string; // ISO datetime
  currentPeriodEnd?: Date | string;   // ISO datetime
  stripeSubscriptionId?: string;
  metadata?: Record<string, unknown>;
}
```

**UpdateSubscriptionDto:**
```typescript
{
  billingCycleKey?: string;       // Can change billing cycle (updates plan automatically)
  expirationDate?: Date | string | null; // ISO datetime (null to clear)
  cancellationDate?: Date | string | null; // ISO datetime (null to clear)
  trialEndDate?: Date | string | null; // ISO datetime (null to clear)
  currentPeriodStart?: Date | string; // ISO datetime
  currentPeriodEnd?: Date | string; // ISO datetime
  stripeSubscriptionId?: string;
  metadata?: Record<string, unknown>;
  // Note: key, customerKey, and activationDate are immutable
}
```

**SubscriptionDto (Output):**
```typescript
{
  key: string;                    // Subscription key (immutable)
  customerKey: string;            // Customer key (immutable)
  productKey: string;             // Product key (resolved from plan)
  planKey: string;                // Plan key (resolved from billing cycle)
  billingCycleKey: string;        // Billing cycle key
  status: string;                 // 'pending' | 'active' | 'trial' | 'cancelled' | 'cancellation_pending' | 'expired' | 'suspended' (calculated dynamically)
  activationDate?: string;        // ISO 8601 (immutable)
  expirationDate?: string;        // ISO 8601
  cancellationDate?: string;      // ISO 8601
  trialEndDate?: string;          // ISO 8601
  currentPeriodStart?: string;    // ISO 8601
  currentPeriodEnd?: string;      // ISO 8601
  stripeSubscriptionId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

---

## Subscription Status Calculation

Subscription status is calculated dynamically based on the current state of the subscription:

1. **'cancelled'** - If `cancellationDate` is set
2. **'expired'** - If `expirationDate` is set and has passed  
3. **'trial'** - If `trialEndDate` is set and is in the future
4. **'cancellation_pending'** - If `cancellationDate` is set but period hasn't ended
5. **'suspended'** - If subscription is suspended (e.g., payment failed)
6. **'active'** - Default status if none of the above conditions apply

The status is recalculated every time the subscription is accessed, ensuring it always reflects the current state based on dates and other properties. Use `syncSubscriptionStatuses()` to batch update stored statuses.

---

## Key Relationships

### Product → Features (Many-to-Many)
- Products can have multiple features
- Features can belong to multiple products
- Managed via `associateFeature()` and `dissociateFeature()`

### Product → Plans (One-to-Many)
- Plans **belong to a Product** (via `productKey`)
- Product can have multiple plans
- Plans are globally unique by `key` (not scoped to product)

### Plan → Features (via Feature Values)
- Plans set values for their product's features
- Managed via `setFeatureValue()` and `removeFeatureValue()`
- Returns array of `{ featureKey, value }`

### Plan → BillingCycle (One-to-Many)
- Plans can have multiple billing cycles
- Billing cycles are globally unique by `key` (not scoped to plan)
- Billing cycles can reference external product IDs (e.g., Stripe price IDs)
- Product and plan keys are resolved from the billing cycle's plan relationship

### Customer → Subscriptions (One-to-Many)
- Customers identified by `key` (your user ID)
- Customers can have multiple active subscriptions
- Subscriptions link to plans via `planKey`

### Subscription → Plan (Many-to-One)
- Subscription references a plan via `planKey`
- Subscription can override feature values

## Feature Resolution Hierarchy

When checking feature values via `featureChecker`:

1. **Subscription Override** (highest priority)
   - Permanent or temporary overrides on the subscription
2. **Plan Value** 
   - Value set on the plan
3. **Feature Default** (fallback)
   - Default value from the feature definition

---

## Important Notes

### Keys vs IDs
- **Keys** are human-readable strings (e.g., "professional", "max-projects")
- **IDs** are UUIDs (internal only)
- Use `getByKey()` methods to lookup by key
- All public APIs use keys, not IDs

### Product-Plan-Feature Relationship
1. Create Product
2. Create Features (globally)
3. Associate Features with Product
4. Create Plans with Product Key
5. Set Feature Values on Plans

### Customer Keys
- Always use **your application's user/customer ID** as `key`
- Feature checker uses `customerKey` (your key, not Subscrio's internal ID)
- All customer methods use `key` parameter, not `externalId`

### Stripe Integration
- Optional
- You verify webhook signatures
- Pass verified events to `processStripeEvent()`
- Price mapping via billing cycle `externalProductId` field
