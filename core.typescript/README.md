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
├── key: string (your app's user ID)
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
  planKey: freePlan.key,
  key: 'monthly',
  displayName: 'Monthly',
  durationValue: 1,
  durationUnit: 'months'
});

// Set feature value for plan
await subscrio.plans.setFeatureValue(freePlan.key, maxProjects.key, '3');
```

### 2. Create Customer and Subscription

```typescript
// Create customer
const customer = await subscrio.customers.createCustomer({
  key: 'user-123'
});

// Create subscription (optimized API - only 2 required parameters)
const subscription = await subscrio.subscriptions.createSubscription({
  key: 'sub-123',
  customerKey: 'user-123',
  billingCycleKey: monthlyCycle.key  // Plan and product derived automatically
});
```

### 3. Check Feature Availability

```typescript
// Option 1: Get features for specific subscription (most reliable)
const subscriptionFeatures = await subscrio.featureChecker.getAllFeaturesForSubscription(subscription.key);
console.log(subscriptionFeatures.get('max-projects')); // "3"

// Option 2: Get single feature value for customer in specific product
const maxProjects = await subscrio.featureChecker.getValueForCustomer('user-123', product.key, 'max-projects');
console.log(maxProjects); // "3"

// Option 3: Check if feature is enabled (for toggle features)
const hasTeamAccess = await subscrio.featureChecker.isEnabledForCustomer('user-123', product.key, 'team-collaboration');
console.log(hasTeamAccess); // true/false

// Option 4: Get all features for customer in specific product
const allFeatures = await subscrio.featureChecker.getAllFeaturesForCustomer('user-123', product.key);
console.log(allFeatures.get('max-projects')); // "3"

// Enforce limits in your app
const maxProjects = parseInt(await subscrio.featureChecker.getValueForCustomer('user-123', product.key, 'max-projects') || '0');
if (currentProjectCount >= maxProjects) {
  throw new Error('Project limit reached');
}
```

## Configuration

```typescript
const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY  // Optional
  }
});
```

## Advanced Features

### Feature Overrides
```typescript
// Add temporary override (cleared on renewal)
await subscrio.subscriptions.addFeatureOverride(
  subscription.key, 
  'max-projects', 
  '10', 
  'temporary'
);

// Add permanent override (persists through renewals)
await subscrio.subscriptions.addFeatureOverride(
  subscription.key, 
  'max-projects', 
  'unlimited', 
  'permanent'
);
```

### Multiple Subscriptions
```typescript
// Customer can have multiple active subscriptions
const teamSubscription = await subscrio.subscriptions.createSubscription({
  key: 'team-sub',
  customerKey: 'user-123',
  billingCycleKey: 'team-monthly'
});

// Features resolve from all active subscriptions
const allFeatures = await subscrio.featureChecker.getAllFeaturesForCustomer('user-123', 'my-product');
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Optional
LOG_LEVEL=info
STRIPE_SECRET_KEY=sk_test_...
ADMIN_PASSPHRASE=your-secure-passphrase
```

## Production Deployment

1. **Database**: PostgreSQL 12+ required
2. **Schema**: Run `await subscrio.installSchema()` once
3. **Environment**: Set `DATABASE_URL` and other config
4. **Monitoring**: Enable logging for production debugging

## API Reference

- [Complete API Documentation](./docs/API_REFERENCE.md)
- [Sample Application](./sample/)
- [Test Examples](./tests/e2e/)

