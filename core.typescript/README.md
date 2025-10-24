# @subscrio/core

**The missing layer in your SaaS stack: The entitlement engine that translates subscriptions into feature access.**

Every time a user clicks a button, creates a resource, or calls an API endpoint, your application asks: "Is this customer allowed to do this?" Subscrio is the definitive answer.

## The Problem You're Solving

**Right now, you have two disconnected systems:**

1. **Billing Platform** (Stripe, Paddle) - Handles payments and invoices
2. **Your Application** - Enforces what users can actually do

**The gap:** Who translates "Pro Plan" into actionable permissions throughout your app?

```typescript
// This is what you're doing now (scattered across dozens of files):
if (customer.plan === 'pro') {
  maxProjects = 50;
} else if (customer.plan === 'enterprise') {
  maxProjects = 999;
}
```

**This creates massive problems:**
- Change a plan? Requires code deployment
- Custom deals? Engineers build one-off override logic  
- Multiple products? Conditional statements become unmaintainable
- Sales flexibility? Product team can't experiment without engineering
- Vendor lock-in? You're forced to parse your billing system's data structures

## The Solution

**Subscrio is the entitlement layer your SaaS application is missing.**

It's not feature flags for gradual rollouts. It's not a billing system for processing payments. It's the authoritative system between them that knows exactly what each customer is entitled to access.

### How It Works

**1. Define Your Business Model (Once)**
```typescript
// Configure products, features, and plans
const product = await subscrio.products.createProduct({
  key: 'project-management',
  displayName: 'Project Management'
});

const maxProjects = await subscrio.features.createFeature({
  key: 'max-projects',
  displayName: 'Max Projects',
  valueType: 'numeric',
  defaultValue: '3'
});

const proPlan = await subscrio.plans.createPlan({
  productKey: 'project-management',
  key: 'pro',
  displayName: 'Pro Plan'
});

// Set feature values per plan
await subscrio.plans.setFeatureValue('pro', 'max-projects', '50');
```

**2. Enforce Entitlements Throughout Your App**
```typescript
// In your project creation endpoint:
const maxProjects = await subscrio.featureChecker.getValueForCustomer(
  customerId, 
  'project-management', 
  'max-projects'
);

if (currentProjects >= parseInt(maxProjects)) {
  throw new Error('Upgrade to create more projects');
}
```

**3. Business Teams Control Configuration**
```typescript
// Sales needs to close a deal with custom terms:
await subscrio.subscriptions.addFeatureOverride(
  subscriptionId,
  'max-projects', 
  '75', 
  'temporary', // expires in 12 months
  new Date('2025-12-31')
);
// Customer immediately gets access—no deployment needed
```

## Why Subscrio Wins

**vs. Building In-House:**
- ✅ Saves 120+ hours of development
- ✅ Production-tested with audit trails  
- ✅ No technical debt as your business model evolves

**vs. Feature Flags (LaunchDarkly, Split):**
- ✅ Feature flags roll out new code gradually
- ✅ Subscrio manages what customers paid for and can access
- ✅ Different problems, different solutions

**vs. Billing Systems (Stripe, Paddle):**
- ✅ Billing handles payments and invoices
- ✅ Subscrio translates subscriptions into feature entitlements
- ✅ Tightly integrated, not competing

## Key Benefits

✅ **Zero Configuration**: Works out of the box with sensible defaults  
✅ **Feature Resolution**: Automatic hierarchy (subscription → plan → default)  
✅ **Multiple Subscriptions**: Customers can have multiple active subscriptions  
✅ **Trial Management**: Built-in trial period handling  
✅ **Override System**: Temporary and permanent feature overrides  
✅ **Status Calculation**: Dynamic subscription status based on dates  
✅ **Production Ready**: Battle-tested with comprehensive error handling  
✅ **Type Safety**: Full TypeScript support with compile-time validation  
✅ **Business Flexibility**: Change plans and grant exceptions without deployments  

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
├── key: string
├── displayName: string
├── → Features (many-to-many)  # Products can have multiple features
└── → Plans (one-to-many)     # Products can have multiple plans
    └── Plan
        ├── key: string
        ├── displayName: string
        ├── featureValues: PlanFeatureValue[]  # Embedded feature value overrides
        │   ├── featureId: string
        │   ├── value: string
        │   ├── createdAt: Date
        │   └── updatedAt: Date
        └── → BillingCycles (one-to-many)
            └── BillingCycle
                ├── key: string
                ├── durationValue: number
                ├── durationUnit: 'days' | 'months' | 'years'
                └── externalProductId: string

Customer
├── key: string (your app's user ID)
├── displayName: string
├── email: string
└── → Subscriptions (one-to-many)
    └── Subscription
        ├── key: string
        ├── status: 'active' | 'trial' | 'cancelled' | 'cancellation_pending' | 'expired' | 'suspended' (calculated dynamically)
        ├── currentPeriodStart: Date
        ├── currentPeriodEnd: Date
        ├── trialEndDate?: Date
        └── featureOverrides: FeatureOverride[]  # Embedded feature overrides
            ├── featureId: string
            ├── value: string
            ├── type: 'permanent' | 'temporary'
            └── createdAt: Date

Feature Value Resolution (how we determine access/value):
1. Subscription Override (highest priority)
2. Plan Value
3. Feature Default (fallback)

Subscription Status Calculation (calculated dynamically):
1. If cancelled and cancellation date has passed → 'cancelled'
2. If cancellation is scheduled for the future → 'cancellation_pending'
3. If expired and expiration date has passed → 'expired'
4. If trial end date is in the future → 'trial'
5. If trial end date has passed or no trial → 'active'
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

### 3. Manage Subscription Lifecycle

```typescript
// Update subscription properties (status calculated automatically)
await subscrio.subscriptions.updateSubscription('sub-123', {
  cancellationDate: new Date().toISOString(),  // Cancel subscription
  expirationDate: new Date().toISOString(),   // Expire subscription
  trialEndDate: undefined,                     // Convert trial to active
  metadata: { source: 'webhook' }            // Add metadata
});

// Archive/unarchive subscriptions (standard entity operations)
await subscrio.subscriptions.archiveSubscription('sub-123');
await subscrio.subscriptions.unarchiveSubscription('sub-123');

// Advanced subscription search
const activeSubscriptions = await subscrio.subscriptions.findSubscriptions({
  status: 'active',
  hasTrial: false,
  activationDateFrom: new Date('2024-01-01'),
  limit: 50
});

// Get customer's subscriptions
const customerSubscriptions = await subscrio.subscriptions.getSubscriptionsByCustomer('user-123');
```

### 4. Check Feature Availability

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

