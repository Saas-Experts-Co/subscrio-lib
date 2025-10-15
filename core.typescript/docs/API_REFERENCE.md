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
- `subscrio.renewalCycles` - RenewalCycleManagementService
- `subscrio.featureChecker` - FeatureCheckerService
- `subscrio.stripe` - StripeIntegrationService
- `subscrio.config` - ConfigurationSyncService

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
  id: string;                     // UUIDv7
  key: string;
  displayName: string;
  description?: string;
  status: string;                 // 'active' | 'inactive' | 'archived'
  displayOrder: number;
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
  id: string;                     // UUIDv7
  key: string;
  displayName: string;
  description?: string;
  valueType: string;              // 'toggle' | 'numeric' | 'text'
  defaultValue: string;
  groupName?: string;
  status: string;                 // 'active' | 'archived'
  displayOrder: number;
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
  productId: string;              // UUID of the product
  key: string;                    // lowercase-with-hyphens, unique within product
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  defaultRenewalCycleId?: string; // UUID of renewal cycle
  onExpireTransitionToPlanId?: string; // UUID of plan to transition to
  displayOrder?: number;          // integer >= 0
  metadata?: Record<string, unknown>;
}
```

**PlanDto (Output):**
```typescript
{
  id: string;                     // UUIDv7
  productId: string;              // UUID
  key: string;
  displayName: string;
  description?: string;
  status: string;                 // 'active' | 'inactive' | 'archived'
  defaultRenewalCycleId?: string; // UUID
  onExpireTransitionToPlanId?: string; // UUID
  displayOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### RenewalCycle

**CreateRenewalCycleDto:**
```typescript
{
  key: string;                    // lowercase-with-hyphens, unique
  displayName: string;            // 1-255 chars
  description?: string;           // max 1000 chars
  durationValue: number;          // integer >= 1
  durationUnit: 'days' | 'months' | 'years';
  gracePeriodDays?: number;       // integer >= 0, default 0
  displayOrder?: number;          // integer >= 0
  metadata?: Record<string, unknown>;
}
```

**RenewalCycleDto (Output):**
```typescript
{
  id: string;                     // UUIDv7
  key: string;
  displayName: string;
  description?: string;
  durationValue: number;
  durationUnit: string;           // 'days' | 'months' | 'years'
  gracePeriodDays: number;
  displayOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Customer

**CreateCustomerDto:**
```typescript
{
  externalId: string;             // 1-255 chars, unique (your user ID)
  displayName?: string;           // max 255 chars
  email?: string;                 // valid email
  externalBillingId?: string;     // max 255 chars (e.g., Stripe customer ID)
  metadata?: Record<string, unknown>;
}
```

**CustomerDto (Output):**
```typescript
{
  id: string;                     // UUIDv7
  externalId: string;
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
  customerExternalId: string;     // Customer's external ID
  planId: string;                 // UUID of plan
  renewalCycleId?: string;        // UUID of renewal cycle (optional)
  status?: 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended';
  activationDate?: Date | string; // ISO datetime
  expirationDate?: Date | string; // ISO datetime
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
  id: string;                     // UUIDv7
  customerId: string;             // UUID (internal customer ID)
  planId: string;                 // UUID
  renewalCycleId?: string;        // UUID
  status: string;                 // 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended'
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

## Service Methods

### ProductManagementService (`subscrio.products`)

```typescript
// Create
createProduct(dto: CreateProductDto): Promise<ProductDto>

// Read
getProduct(id: string): Promise<ProductDto | null>
getProductByKey(key: string): Promise<ProductDto | null>
listProducts(filters?: ProductFilterDto): Promise<ProductDto[]>

// Update
updateProduct(id: string, dto: UpdateProductDto): Promise<ProductDto>
activateProduct(id: string): Promise<ProductDto>
archiveProduct(id: string): Promise<ProductDto>

// Delete
deleteProduct(id: string): Promise<void>

// Feature Association
associateFeature(productId: string, featureId: string, displayOrder?: number): Promise<void>
dissociateFeature(productId: string, featureId: string): Promise<void>
```

### FeatureManagementService (`subscrio.features`)

```typescript
// Create
createFeature(dto: CreateFeatureDto): Promise<FeatureDto>

// Read
getFeature(id: string): Promise<FeatureDto | null>
getFeatureByKey(key: string): Promise<FeatureDto | null>
listFeatures(filters?: FeatureFilterDto): Promise<FeatureDto[]>
getFeaturesByProduct(productId: string): Promise<FeatureDto[]>

// Update
updateFeature(id: string, dto: UpdateFeatureDto): Promise<FeatureDto>
archiveFeature(id: string): Promise<void>
unarchiveFeature(id: string): Promise<void>

// Delete
deleteFeature(id: string): Promise<void>
```

### PlanManagementService (`subscrio.plans`)

```typescript
// Create
createPlan(dto: CreatePlanDto): Promise<PlanDto>

// Read
getPlan(id: string): Promise<PlanDto | null>
getPlanByProductIdAndKey(productId: string, key: string): Promise<PlanDto | null>
listPlans(filters?: PlanFilterDto): Promise<PlanDto[]>
getPlansByProduct(productId: string): Promise<PlanDto[]>
getPlanFeatures(planId: string): Promise<Array<{ featureId: string; value: string }>>
getFeatureValue(planId: string, featureId: string): Promise<string | null>

// Update
updatePlan(id: string, dto: UpdatePlanDto): Promise<PlanDto>
activatePlan(id: string): Promise<void>
deactivatePlan(id: string): Promise<void>
archivePlan(id: string): Promise<void>
setFeatureValue(planId: string, featureId: string, value: string): Promise<void>
removeFeatureValue(planId: string, featureId: string): Promise<void>

// Delete
deletePlan(id: string): Promise<void>
```

### RenewalCycleManagementService (`subscrio.renewalCycles`)

```typescript
// Create
createRenewalCycle(dto: CreateRenewalCycleDto): Promise<RenewalCycleDto>

// Read
getRenewalCycle(id: string): Promise<RenewalCycleDto | null>
getRenewalCycleByKey(key: string): Promise<RenewalCycleDto | null>
listRenewalCycles(filters?: RenewalCycleFilterDto): Promise<RenewalCycleDto[]>
getRenewalCyclesByDurationUnit(durationUnit: DurationUnit): Promise<RenewalCycleDto[]>
getDefaultRenewalCycles(): Promise<RenewalCycleDto[]>

// Update
updateRenewalCycle(id: string, dto: UpdateRenewalCycleDto): Promise<RenewalCycleDto>

// Delete
deleteRenewalCycle(id: string): Promise<void>
```

### CustomerManagementService (`subscrio.customers`)

```typescript
// Create
createCustomer(dto: CreateCustomerDto): Promise<CustomerDto>

// Read
getCustomer(id: string): Promise<CustomerDto | null>
getCustomerByExternalId(externalId: string): Promise<CustomerDto | null>
getCustomerByExternalBillingId(externalBillingId: string): Promise<CustomerDto | null>
listCustomers(filters?: CustomerFilterDto): Promise<CustomerDto[]>

// Update
updateCustomer(id: string, dto: UpdateCustomerDto): Promise<CustomerDto>
activateCustomer(id: string): Promise<void>
suspendCustomer(id: string): Promise<void>
markCustomerDeleted(id: string): Promise<void>

// Delete
deleteCustomer(id: string): Promise<void>
```

### SubscriptionManagementService (`subscrio.subscriptions`)

```typescript
// Create
createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionDto>

// Read
getSubscription(id: string): Promise<SubscriptionDto | null>
getSubscriptionByStripeId(stripeId: string): Promise<SubscriptionDto | null>
listSubscriptions(filters?: SubscriptionFilterDto): Promise<SubscriptionDto[]>
getSubscriptionsByCustomer(customerExternalId: string): Promise<SubscriptionDto[]>
getActiveSubscriptionsByCustomer(customerExternalId: string): Promise<SubscriptionDto[]>

// Update
updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDto>
cancelSubscription(id: string): Promise<void>
expireSubscription(id: string): Promise<void>
renewSubscription(id: string): Promise<void>

// Delete
deleteSubscription(id: string): Promise<void>

// Feature Overrides
addFeatureOverride(
  subscriptionId: string,
  featureId: string,
  value: string,
  type: 'permanent' | 'temporary'
): Promise<void>
removeFeatureOverride(subscriptionId: string, featureId: string): Promise<void>
clearTemporaryOverrides(subscriptionId: string): Promise<void>
```

### FeatureCheckerService (`subscrio.featureChecker`)

**Primary API for checking features in your application:**

```typescript
// Check if toggle feature is enabled
isEnabled(
  customerExternalId: string,
  featureKey: string
): Promise<boolean>

// Get all features for a customer (returns Map<featureKey, value>)
getAllFeatures(
  customerExternalId: string
): Promise<Map<string, string>>

// Get features for a specific subscription
getFeaturesForSubscription(
  subscriptionId: string
): Promise<Map<string, string>>

// Check if customer has access to a plan
hasPlanAccess(
  customerExternalId: string,
  planId: string
): Promise<boolean>

// Get active plan IDs for customer
getActivePlans(
  customerExternalId: string
): Promise<string[]>

// Get usage summary
getFeatureUsageSummary(
  customerExternalId: string
): Promise<{
  features: Map<string, string>;
  activePlans: string[];
  subscriptions: SubscriptionDto[];
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
  renewalCycleId: string,
  priceId: string
): Promise<SubscriptionDto>
```

### ConfigurationSyncService (`subscrio.config`)

```typescript
// Sync configuration from JSON
syncConfiguration(config: SubscrioConfiguration): Promise<ConfigSyncResult>
```

---

## Key Relationships

### Product → Features (Many-to-Many)
- Products can have multiple features
- Features can belong to multiple products
- Managed via `associateFeature()` and `dissociateFeature()`

### Product → Plans (One-to-Many)
- Plans **belong to a Product** (via `productId`)
- Product can have multiple plans
- Plans are unique by `key` within a product

### Plan → Features (via Feature Values)
- Plans set values for their product's features
- Managed via `setFeatureValue()` and `removeFeatureValue()`
- Returns array of `{ featureId, value }`

### Plan → RenewalCycle (Optional Reference)
- Plans can reference a `defaultRenewalCycleId`
- Renewal cycles are independent entities

### Customer → Subscriptions (One-to-Many)
- Customers identified by `externalId` (your user ID)
- Customers can have multiple active subscriptions
- Subscriptions link to plans via `planId`

### Subscription → Plan (Many-to-One)
- Subscription references a plan via `planId`
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

### IDs
- All entity IDs are **UUIDv7**
- Generate at application layer, not database
- Customers use `externalId` (your system's ID)

### Product-Plan-Feature Relationship
1. Create Product
2. Create Features (globally)
3. Associate Features with Product
4. Create Plans with Product ID
5. Set Feature Values on Plans

### Keys vs IDs
- **Keys** are human-readable strings (e.g., "professional", "max-projects")
- **IDs** are UUIDs
- Use `getByKey()` methods to lookup by key
- Most relationships use IDs

### Customer External ID
- Always use **your application's user/customer ID** as `externalId`
- Feature checker uses `customerExternalId` (your ID, not Subscrio's UUID)

### Stripe Integration
- Optional
- You verify webhook signatures
- Pass verified events to `processStripeEvent()`
- Price mapping via `setStripePriceForCycle()`

