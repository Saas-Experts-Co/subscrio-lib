# @subscrio/core

TypeScript library for managing SaaS subscriptions, features, and plans.

## Installation

```bash
npm install @subscrio/core
```

## Quick Start

```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({
  database: {
    connectionString: 'postgresql://user:password@localhost:5432/mydb'
  }
});

// Install schema (first time only)
await subscrio.installSchema();
```

## Entity Hierarchy

```
Features (standalone)
├── key: string
├── valueType: 'toggle' | 'numeric' | 'text'
└── defaultValue: string

Product
├── ProductFeatures (many-to-many via ProductFeature)
│   └── Feature (subset of all features)
└── Plans (one-to-many)
    └── Plan
        ├── key: string
        ├── displayName: string
        ├── onExpireTransitionToPlanId (self-reference)
        └── BillingCycles (one-to-many)
            └── BillingCycle
                ├── key: string
                ├── durationValue: number
                ├── durationUnit: 'days' | 'months' | 'years'
                └── externalProductId: string

Customer
├── externalId: string (your app's user ID)
├── displayName: string
├── email: string
└── Subscriptions (one-to-many)
    └── Subscription
        ├── status: 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended'
        ├── currentPeriodStart: Date
        ├── currentPeriodEnd: Date
        ├── trialEndDate?: Date
        ├── autoRenew: boolean
        └── FeatureOverrides (one-to-many)
            ├── value: string
            └── type: 'permanent' | 'temporary'

Feature Value Resolution (how we determine access/value):
1. Subscription Override (highest priority)
2. Plan Value
3. Feature Default (fallback)
```

## Basic Usage

### 1. Setup Product Structure (Minimum)

```typescript
// Create your first product
const product = await subscrio.products.createProduct({
  key: 'my-product',
  displayName: 'My Product'
});

// Create one feature
const maxProjects = await subscrio.features.createFeature({
  key: 'max-projects',
  displayName: 'Max Projects',
  valueType: 'numeric',
  defaultValue: '3'
});

// Associate feature with product
await subscrio.products.associateFeature(product.key, maxProjects.key);

// Create one plan
const freePlan = await subscrio.plans.createPlan({
  productKey: product.key,
  key: 'free',
  displayName: 'Free Plan'
});

// Create one billing cycle
const monthlyCycle = await subscrio.billingCycles.createBillingCycle({
  productKey: product.key,
  planKey: freePlan.key,
  key: 'monthly',
  displayName: 'Monthly',
  durationValue: 1,
  durationUnit: 'months'
});

// Set feature value for plan
await subscrio.plans.setFeatureValue(product.key, freePlan.key, maxProjects.key, '3');
```

### 2. Create Customer and Subscription

```typescript
// Create customer
const customer = await subscrio.customers.createCustomer({
  externalId: 'user-123'
});

// Create subscription
const subscription = await subscrio.subscriptions.createSubscription({
  key: 'sub-123',
  customerKey: 'user-123',
  productKey: product.key,
  planKey: freePlan.key,
  billingCycleKey: monthlyCycle.key
});
```

### 3. Check Feature Availability

```typescript
// Get features for specific subscription (recommended)
const subscriptionFeatures = await subscrio.featureChecker.getFeaturesForSubscription(subscription.id);
console.log(subscriptionFeatures.get('max-projects')); // "3"

// Check if feature is enabled (for toggle features)
const hasTeamAccess = await subscrio.featureChecker.isEnabled('user-123', 'team-collaboration');
console.log(hasTeamAccess); // true/false

// Get single feature value for customer (across all products)
const maxProjects = await subscrio.featureChecker.getValue('user-123', 'max-projects');
console.log(maxProjects); // "3"

// Enforce limits in your app
const maxProjects = parseInt(await subscrio.featureChecker.getValue('user-123', 'max-projects') || '0');
if (currentProjectCount >= maxProjects) {
  throw new Error('Project limit reached');
}
```

