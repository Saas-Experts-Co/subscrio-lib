# Subscrio Core API Reference

Complete documentation of all data structures and methods exposed by `@subscrio/core`.

## Table of Contents
- [Main Class](#main-class)
- [Data Structures (DTOs)](#data-structures-dtos)
- [Service Methods](#service-methods)

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
- `await subscrio.close(): Promise<void>` - Close database connections

---

## Data Structures (DTOs)

### Product

**CreateProductDto:**
```typescript
{
  key: string;                    // lowercase-with-hyphens, unique
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  displayOrder?: number;          // integer >= 0
  metadata?: Record<string, unknown>;
}
```

**ProductDto (Output):**
```typescript
{
  key: string;
  displayName: string;
  description?: string;
  status: string;                 // 'active' | 'inactive' | 'archived'
  metadata?: Record<string, unknown>;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Feature

**CreateFeatureDto:**
```typescript
{
  key: string;                    // alphanumeric-with-hyphens, globally unique
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  valueType: 'toggle' | 'numeric' | 'text';
  defaultValue: string;           // required
  groupName?: string;             // max 255 chars
  displayOrder?: number;          // integer >= 0
  validator?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

**FeatureDto (Output):**
```typescript
{
  key: string;
  displayName: string;
  description?: string;
  valueType: string;              // 'toggle' | 'numeric' | 'text'
  defaultValue: string;
  groupName?: string;
  status: string;                 // 'active' | 'archived'
  validator?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Plan

**CreatePlanDto:**
```typescript
{
  productKey: string;             // Key of the product
  key: string;                    // lowercase-with-hyphens, unique within product
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  defaultRenewalCycleKey?: string; // Key of renewal cycle
  onExpireTransitionToPlanKey?: string; // Key of plan to transition to
  metadata?: Record<string, unknown>;
}
```

**PlanDto (Output):**
```typescript
{
  productKey: string;             // Product key
  key: string;
  displayName: string;
  description?: string;
  status: string;                 // 'active' | 'inactive' | 'archived'
  defaultRenewalCycleKey?: string; // Renewal cycle key
  onExpireTransitionToPlanKey?: string; // Plan key
  metadata?: Record<string, unknown>;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### BillingCycle

**CreateBillingCycleDto:**
```typescript
{
  productKey: string;             // Key of the product
  planKey: string;                // Key of the plan
  key: string;                    // lowercase-with-hyphens, unique within plan
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  durationValue: number;          // integer >= 1
  durationUnit: 'days' | 'weeks' | 'months' | 'years';
  externalProductId?: string;     // max 255 chars (e.g., Stripe price ID)
}
```

**BillingCycleDto (Output):**
```typescript
{
  productKey: string;             // Product key
  planKey: string;                // Plan key
  key: string;
  displayName: string;
  description?: string;
  durationValue: number;
  durationUnit: string;           // 'days' | 'weeks' | 'months' | 'years'
  externalProductId?: string;
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

**CustomerDto (Output):**
```typescript
{
  key: string;
  displayName?: string;
  email?: string;
  externalBillingId?: string;
  status: string;                 // 'active' | 'suspended' | 'deleted'
  metadata?: Record<string, unknown>;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Subscription

**CreateSubscriptionDto:**
```typescript
{
  key: string;                    // Unique subscription key
  customerKey: string;            // Customer's key
  productKey: string;             // Product key
  planKey: string;                // Plan key
  billingCycleKey: string;        // Billing cycle key (required)
  activationDate?: Date | string; // ISO datetime
  expirationDate?: Date | string; // ISO datetime
  cancellationDate?: Date | string; // ISO datetime
  trialEndDate?: Date | string;   // ISO datetime
  currentPeriodStart?: Date | string; // ISO datetime
  currentPeriodEnd?: Date | string;   // ISO datetime
  autoRenew?: boolean;            // default true
  stripeSubscriptionId?: string;
  metadata?: Record<string, unknown>;
}
```

**SubscriptionDto (Output):**
```typescript
{
  key: string;                    // Subscription key
  customerKey: string;            // Customer key
  productKey: string;             // Product key
  planKey: string;                // Plan key
  billingCycleKey: string;        // Billing cycle key
  status: string;                 // 'pending' | 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended' (calculated dynamically)
  activationDate?: string;        // ISO 8601
  expirationDate?: string;        // ISO 8601
  cancellationDate?: string;      // ISO 8601
  trialEndDate?: string;          // ISO 8601
  currentPeriodStart?: string;    // ISO 8601
  currentPeriodEnd?: string;      // ISO 8601
  autoRenew: boolean;
  stripeSubscriptionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

---

## Subscription Status Calculation

Subscription status is calculated dynamically based on the current state of the subscription:

1. **'cancelled'** - If `cancellationDate` is set and has passed
2. **'expired'** - If `expirationDate` is set and has passed  
3. **'trial'** - If `trialEndDate` is set and is in the future
4. **'active'** - Default status if none of the above conditions apply

The status is recalculated every time the subscription is accessed, ensuring it always reflects the current state based on dates and other properties.

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
activateProduct(key: string): Promise<ProductDto>
archiveProduct(key: string): Promise<ProductDto>

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
getPlan(productKey: string, planKey: string): Promise<PlanDto | null>
listPlans(filters?: PlanFilterDto): Promise<PlanDto[]>
getPlansByProduct(productKey: string): Promise<PlanDto[]>
getPlanFeatures(productKey: string, planKey: string): Promise<Array<{ featureKey: string; value: string }>>
getFeatureValue(productKey: string, planKey: string, featureKey: string): Promise<string | null>

// Update
updatePlan(productKey: string, planKey: string, dto: UpdatePlanDto): Promise<PlanDto>
activatePlan(productKey: string, planKey: string): Promise<void>
deactivatePlan(productKey: string, planKey: string): Promise<void>
archivePlan(productKey: string, planKey: string): Promise<void>
setFeatureValue(productKey: string, planKey: string, featureKey: string, value: string): Promise<void>
removeFeatureValue(productKey: string, planKey: string, featureKey: string): Promise<void>

// Delete
deletePlan(productKey: string, planKey: string): Promise<void>
```

### BillingCycleManagementService (`subscrio.billingCycles`)

```typescript
// Create
createBillingCycle(dto: CreateBillingCycleDto): Promise<BillingCycleDto>

// Read
getBillingCycle(productKey: string, planKey: string, key: string): Promise<BillingCycleDto | null>
getBillingCyclesByPlan(productKey: string, planKey: string): Promise<BillingCycleDto[]>
listBillingCycles(filters?: BillingCycleFilterDto): Promise<BillingCycleDto[]>
getBillingCyclesByDurationUnit(durationUnit: DurationUnit): Promise<BillingCycleDto[]>
getDefaultBillingCycles(): Promise<BillingCycleDto[]>

// Update
updateBillingCycle(productKey: string, planKey: string, key: string, dto: UpdateBillingCycleDto): Promise<BillingCycleDto>

// Delete
deleteBillingCycle(productKey: string, planKey: string, key: string): Promise<void>

// Utility
calculateNextPeriodEnd(billingCycleId: string, currentPeriodEnd: Date): Promise<Date>
```

### CustomerManagementService (`subscrio.customers`)

```typescript
// Create
createCustomer(dto: CreateCustomerDto): Promise<CustomerDto>

// Read
getCustomer(externalId: string): Promise<CustomerDto | null>
listCustomers(filters?: CustomerFilterDto): Promise<CustomerDto[]>

// Update
updateCustomer(externalId: string, dto: UpdateCustomerDto): Promise<CustomerDto>
activateCustomer(externalId: string): Promise<void>
suspendCustomer(externalId: string): Promise<void>
markCustomerDeleted(externalId: string): Promise<void>

// Delete
deleteCustomer(externalId: string): Promise<void>
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
  type: 'permanent' | 'temporary'
): Promise<void>
removeFeatureOverride(subscriptionKey: string, featureKey: string): Promise<void>
clearTemporaryOverrides(subscriptionKey: string): Promise<void>
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
  customerExternalId: string,
  productKey: string,
  featureKey: string,
  defaultValue?: T
): Promise<T | null>

isEnabledForCustomer(
  customerExternalId: string,
  productKey: string,
  featureKey: string
): Promise<boolean>

getAllFeaturesForCustomer(
  customerExternalId: string,
  productKey: string
): Promise<Map<string, string>>

// Check if customer has access to a plan
hasPlanAccess(
  customerExternalId: string,
  productKey: string,
  planKey: string
): Promise<boolean>

// Get active plan keys for customer
getActivePlans(
  customerExternalId: string
): Promise<string[]>

// Get usage summary for a specific product
getFeatureUsageSummary(
  customerExternalId: string,
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
  customerExternalId: string,
  planId: string,
  billingCycleId: string,
  stripePriceId: string
): Promise<Subscription>
```

---

## Key Relationships

### Product → Features (Many-to-Many)
- Products can have multiple features
- Features can belong to multiple products
- Managed via `associateFeature()` and `dissociateFeature()`

### Product → Plans (One-to-Many)
- Plans **belong to a Product** (via `productKey`)
- Product can have multiple plans
- Plans are unique by `key` within a product

### Plan → Features (via Feature Values)
- Plans set values for their product's features
- Managed via `setFeatureValue()` and `removeFeatureValue()`
- Returns array of `{ featureKey, value }`

### Plan → BillingCycle (One-to-Many)
- Plans can have multiple billing cycles
- Billing cycles are unique by `key` within a plan
- Billing cycles can reference external product IDs (e.g., Stripe price IDs)

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
- Feature checker uses `customerExternalId` (your key, not Subscrio's internal ID)

### Stripe Integration
- Optional
- You verify webhook signatures
- Pass verified events to `processStripeEvent()`
- Price mapping via `setStripePriceForCycle()`

