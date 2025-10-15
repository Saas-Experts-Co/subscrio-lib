# How to Use Subscrio

A practical guide for integrating Subscrio into your SaaS application.

---

## Quick Start

```bash
npm install @subscrio/core
```

```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({
  database: { connectionString: process.env.DATABASE_URL }
});

// Install schema
await subscrio.installSchema();

// Setup your product
const product = await subscrio.products.createProduct({
  key: 'my-saas',
  displayName: 'My SaaS App'
});

// Create a feature
const maxUsersFeature = await subscrio.features.createFeature({
  key: 'max-users',
  displayName: 'Maximum Users',
  valueType: 'numeric',
  defaultValue: '5'
});

// Associate feature with product
await subscrio.products.associateFeature(product.id, maxUsersFeature.id);

// Create a plan
const proPlan = await subscrio.plans.createPlan({
  productId: product.id,
  key: 'professional',
  displayName: 'Professional Plan'
});

// Set feature value for the plan
await subscrio.plans.setFeatureValue(proPlan.id, maxUsersFeature.id, '25');

// Create a customer
const customer = await subscrio.customers.createCustomer({
  externalId: 'user-123' // Your app's user ID
});

// Create a subscription
const subscription = await subscrio.subscriptions.createSubscription({
  customerExternalId: customer.externalId,
  planId: proPlan.id
});

// Check features in your app
const maxUsers = await subscrio.featureChecker.getAllFeatures('user-123');
console.log('Max users:', maxUsers.get('max-users')); // "25"
```

---

## Table of Contents

1. [Setup Pattern](#setup-pattern)
2. [Product Structure](#product-structure)
3. [Feature Checking](#feature-checking)
4. [Managing Subscriptions](#managing-subscriptions)
5. [Advanced Scenarios](#advanced-scenarios)

---

## Setup Pattern

### Application Initialization

```typescript
// lib/subscrio.ts
import { Subscrio } from '@subscrio/core';

let subscrio: Subscrio | null = null;

export async function initializeSubscrio() {
  subscrio = new Subscrio({
    database: {
      connectionString: process.env.DATABASE_URL!
    }
  });

  // Install schema if needed
  const schemaExists = await subscrio.verifySchema();
  if (!schemaExists) {
    console.log('Installing Subscrio schema...');
    await subscrio.installSchema();
  }

  // Setup your product structure
  await setupProductStructure();

  return subscrio;
}

export function getSubscrio(): Subscrio {
  if (!subscrio) {
    throw new Error('Subscrio not initialized');
  }
  return subscrio;
}

async function setupProductStructure() {
  // Your product setup code (see next section)
}
```

### Start Your App

```typescript
// index.ts
import { initializeSubscrio } from './lib/subscrio';

async function main() {
  await initializeSubscrio();
  
  // Start your server
  app.listen(3000);
}

main().catch(console.error);
```

---

## Product Structure

### Step 1: Create Product

```typescript
const subscrio = getSubscrio();

// Create or get product
let product = await subscrio.products.getProductByKey('my-saas-app');

if (!product) {
  product = await subscrio.products.createProduct({
    key: 'my-saas-app',
    displayName: 'My SaaS App',
    description: 'Professional SaaS application'
  });
}
```

### Step 2: Create Features

```typescript
// Define your features
const features = [
  {
    key: 'max-projects',
    displayName: 'Maximum Projects',
    valueType: 'numeric' as const,
    defaultValue: '3'
  },
  {
    key: 'team-collaboration',
    displayName: 'Team Collaboration',
    valueType: 'toggle' as const,
    defaultValue: 'false'
  },
  {
    key: 'api-access',
    displayName: 'API Access',
    valueType: 'toggle' as const,
    defaultValue: 'false'
  }
];

const featureIds = new Map<string, string>();

for (const featureData of features) {
  let feature = await subscrio.features.getFeatureByKey(featureData.key);
  
  if (!feature) {
    feature = await subscrio.features.createFeature(featureData);
  }
  
  featureIds.set(feature.key, feature.id);
  
  // Associate with product
  await subscrio.products.associateFeature(product.id, feature.id);
}
```

### Step 3: Create Renewal Cycles

```typescript
// Create monthly cycle
let monthlyCycle = await subscrio.renewalCycles.getRenewalCycleByKey('monthly');

if (!monthlyCycle) {
  monthlyCycle = await subscrio.renewalCycles.createRenewalCycle({
    key: 'monthly',
    displayName: 'Monthly',
    durationValue: 1,
    durationUnit: 'months',
    gracePeriodDays: 3
  });
}

// Create annual cycle
let annualCycle = await subscrio.renewalCycles.getRenewalCycleByKey('annual');

if (!annualCycle) {
  annualCycle = await subscrio.renewalCycles.createRenewalCycle({
    key: 'annual',
    displayName: 'Annual',
    durationValue: 1,
    durationUnit: 'years',
    gracePeriodDays: 7
  });
}
```

### Step 4: Create Plans

```typescript
// Free Plan
let freePlan = await subscrio.plans.getPlanByProductIdAndKey(product.id, 'free');

if (!freePlan) {
  freePlan = await subscrio.plans.createPlan({
    productId: product.id,
    key: 'free',
    displayName: 'Free Plan',
    description: 'Perfect for individuals',
    defaultRenewalCycleId: monthlyCycle.id
  });

  // Set feature values
  await subscrio.plans.setFeatureValue(
    freePlan.id,
    featureIds.get('max-projects')!,
    '3'
  );
  await subscrio.plans.setFeatureValue(
    freePlan.id,
    featureIds.get('team-collaboration')!,
    'false'
  );
  await subscrio.plans.setFeatureValue(
    freePlan.id,
    featureIds.get('api-access')!,
    'false'
  );
}

// Professional Plan
let proPlan = await subscrio.plans.getPlanByProductIdAndKey(product.id, 'professional');

if (!proPlan) {
  proPlan = await subscrio.plans.createPlan({
    productId: product.id,
    key: 'professional',
    displayName: 'Professional Plan',
    description: 'For small teams',
    defaultRenewalCycleId: monthlyCycle.id
  });

  // Set feature values
  await subscrio.plans.setFeatureValue(
    proPlan.id,
    featureIds.get('max-projects')!,
    '25'
  );
  await subscrio.plans.setFeatureValue(
    proPlan.id,
    featureIds.get('team-collaboration')!,
    'true'
  );
  await subscrio.plans.setFeatureValue(
    proPlan.id,
    featureIds.get('api-access')!,
    'false'
  );
}

// Enterprise Plan with auto-downgrade to Free
let enterprisePlan = await subscrio.plans.getPlanByProductIdAndKey(product.id, 'enterprise');

if (!enterprisePlan) {
  enterprisePlan = await subscrio.plans.createPlan({
    productId: product.id,
    key: 'enterprise',
    displayName: 'Enterprise Plan',
    description: 'For large organizations',
    defaultRenewalCycleId: annualCycle.id,
    onExpireTransitionToPlanId: freePlan.id // Auto-downgrade to free when expires
  });

  // Set feature values
  await subscrio.plans.setFeatureValue(
    enterprisePlan.id,
    featureIds.get('max-projects')!,
    '999'
  );
  await subscrio.plans.setFeatureValue(
    enterprisePlan.id,
    featureIds.get('team-collaboration')!,
    'true'
  );
  await subscrio.plans.setFeatureValue(
    enterprisePlan.id,
    featureIds.get('api-access')!,
    'true'
  );
}
```

---

## Feature Checking

### Check Features in Your App

```typescript
import { getSubscrio } from '../lib/subscrio';

const subscrio = getSubscrio();

// Get all features for a customer
const features = await subscrio.featureChecker.getAllFeatures('user-123');

console.log('Max projects:', features.get('max-projects'));
console.log('Team collaboration:', features.get('team-collaboration'));
```

### Enforce Limits

```typescript
// services/project-service.ts
export class ProjectService {
  async createProject(userId: string, projectData: any) {
    const subscrio = getSubscrio();
    const features = await subscrio.featureChecker.getAllFeatures(userId);
    
    const maxProjects = parseInt(features.get('max-projects') || '0');
    const currentCount = await this.getProjectCount(userId);
    
    if (currentCount >= maxProjects) {
      throw new Error(
        `Project limit reached. Your plan allows ${maxProjects} projects.`
      );
    }
    
    return await this.db.projects.create(projectData);
  }

  async canInviteTeamMembers(userId: string): Promise<boolean> {
    const subscrio = getSubscrio();
    const features = await subscrio.featureChecker.getAllFeatures(userId);
    
    return features.get('team-collaboration') === 'true';
  }
}
```

### Middleware Example (Express)

```typescript
// middleware/feature-check.ts
import { getSubscrio } from '../lib/subscrio';

export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const subscrio = getSubscrio();
    const userId = req.user.id;
    
    const features = await subscrio.featureChecker.getAllFeatures(userId);
    const value = features.get(featureKey);
    
    if (value !== 'true' && value !== undefined) {
      return res.status(403).json({
        error: 'Feature not available in your plan'
      });
    }
    
    next();
  };
}

// Usage
app.get('/api/analytics', 
  authenticate,
  requireFeature('advanced-analytics'),
  async (req, res) => {
    // User has advanced-analytics enabled
  }
);
```

---

## Managing Subscriptions

### Create Customer

```typescript
const subscrio = getSubscrio();

// When user signs up
const customer = await subscrio.customers.createCustomer({
  externalId: user.id, // YOUR app's user ID
  displayName: user.name,
  email: user.email
});
```

### Create Subscription

```typescript
// Get the plan
const plan = await subscrio.plans.getPlanByProductIdAndKey(product.id, 'professional');
const renewalCycle = await subscrio.renewalCycles.getRenewalCycleByKey('monthly');

// Create subscription
const subscription = await subscrio.subscriptions.createSubscription({
  customerExternalId: user.id, // YOUR app's user ID
  planId: plan.id,
  renewalCycleId: renewalCycle.id,
  autoRenew: true
});
```

### Upgrade/Downgrade

```typescript
// Get new plan
const enterprisePlan = await subscrio.plans.getPlanByProductIdAndKey(
  product.id,
  'enterprise'
);

// Update subscription
await subscrio.subscriptions.updateSubscription(subscription.id, {
  planId: enterprisePlan.id
});
```

### Apply Custom Limits (Overrides)

```typescript
// Give specific customer higher limits
const feature = await subscrio.features.getFeatureByKey('max-projects');

await subscrio.subscriptions.addFeatureOverride(
  subscription.id,
  feature.id,
  '100', // Custom limit
  'permanent' // or 'temporary' (cleared on renewal)
);

// Now this customer gets 100 projects instead of plan limit
```

### Cancel Subscription

```typescript
// Cancel at end of period
await subscrio.subscriptions.cancelSubscription(subscription.id);

// The subscription will expire at currentPeriodEnd
```

---

## Advanced Scenarios

### Free Trial

```typescript
const subscription = await subscrio.subscriptions.createSubscription({
  customerExternalId: user.id,
  planId: proPlan.id,
  renewalCycleId: monthlyCycle.id,
  status: 'trial',
  trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  autoRenew: true
});

// After trial ends, subscription automatically becomes 'active'
```

### Temporary Promotional Access

```typescript
const feature = await subscrio.features.getFeatureByKey('advanced-analytics');

// Give temporary access (removed on renewal)
await subscrio.subscriptions.addFeatureOverride(
  subscription.id,
  feature.id,
  'true',
  'temporary'
);

// When subscription renews, override is cleared
```

### Multiple Active Subscriptions

```typescript
// Customer can have multiple active subscriptions
const basicSub = await subscrio.subscriptions.createSubscription({
  customerExternalId: user.id,
  planId: basicPlan.id
});

const addonSub = await subscrio.subscriptions.createSubscription({
  customerExternalId: user.id,
  planId: addonPlan.id
});

// Customer gets features from both plans
const features = await subscrio.featureChecker.getAllFeatures(user.id);
```

### Check Subscription Status

```typescript
const subscriptions = await subscrio.subscriptions.getSubscriptionsByCustomer(user.id);

const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

console.log(`Customer has ${activeSubscriptions.length} active subscriptions`);
```

---

## Feature Resolution Hierarchy

Features are resolved in this priority order:

1. **Subscription Override** (highest priority)
   - Permanent or temporary custom values
2. **Plan Value**
   - Value set on the customer's plan
3. **Feature Default** (fallback)
   - Default value from feature definition

```typescript
// Feature default: '10'
const feature = await subscrio.features.createFeature({
  key: 'max-items',
  valueType: 'numeric',
  defaultValue: '10'
});

// Plan sets it to '50'
await subscrio.plans.setFeatureValue(plan.id, feature.id, '50');

// Subscription overrides to '100'
await subscrio.subscriptions.addFeatureOverride(
  subscription.id,
  feature.id,
  '100',
  'permanent'
);

// Customer gets '100' (override wins)
const features = await subscrio.featureChecker.getAllFeatures(user.id);
console.log(features.get('max-items')); // "100"
```

---

## Best Practices

### 1. Use External IDs

Always use your own user IDs when creating customers:

```typescript
await subscrio.customers.createCustomer({
  externalId: yourUserId, // ← Your app's user ID
  displayName: user.name
});

// Feature checker uses YOUR ID
const features = await subscrio.featureChecker.getAllFeatures(yourUserId);
```

### 2. Check Features at Runtime

Don't cache feature values for long periods:

```typescript
// ✅ Good - fresh check
const features = await subscrio.featureChecker.getAllFeatures(userId);

// ❌ Bad - stale data
const cached = cache.get(`features:${userId}`);
```

### 3. Handle Expired Subscriptions

Set up a cron job to process expirations:

```typescript
// Runs daily
async function processExpiredSubscriptions() {
  const subscrio = getSubscrio();
  
  const allSubs = await subscrio.subscriptions.listSubscriptions();
  const now = new Date();
  
  for (const sub of allSubs) {
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < now) {
      await subscrio.subscriptions.expireSubscription(sub.id);
    }
  }
}
```

### 4. Store Plan Keys in Your Code

Use keys (not IDs) to reference plans:

```typescript
// ✅ Good - use keys
const proPlan = await subscrio.plans.getPlanByProductIdAndKey(
  product.id,
  'professional' // Key in your code
);

// ❌ Bad - hardcoded UUIDs
const plan = await subscrio.plans.getPlan('abc-123-uuid');
```

### 5. Test Feature Resolution

```typescript
// Test the hierarchy works correctly
const feature = await subscrio.features.getFeatureByKey('max-items');
let features = await subscrio.featureChecker.getAllFeatures(userId);
expect(features.get('max-items')).toBe('50'); // Plan value

await subscrio.subscriptions.addFeatureOverride(subId, feature.id, '100', 'permanent');
features = await subscrio.featureChecker.getAllFeatures(userId);
expect(features.get('max-items')).toBe('100'); // Override wins
```

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Optional - for Stripe integration
STRIPE_SECRET_KEY=sk_test_...
```

---

## TypeScript Types

All DTOs are fully typed:

```typescript
import type {
  ProductDto,
  FeatureDto,
  PlanDto,
  CustomerDto,
  SubscriptionDto,
  CreateProductDto,
  CreateFeatureDto
} from '@subscrio/core';

const product: ProductDto = await subscrio.products.createProduct({
  key: 'my-product',
  displayName: 'My Product'
});
```

---

## Complete Setup Example

Here's a complete initialization function:

```typescript
async function setupProductStructure() {
  const subscrio = getSubscrio();
  
  // 1. Product
  const product = await subscrio.products.createProduct({
    key: 'my-saas',
    displayName: 'My SaaS App'
  });
  
  // 2. Features
  const maxProjects = await subscrio.features.createFeature({
    key: 'max-projects',
    displayName: 'Max Projects',
    valueType: 'numeric',
    defaultValue: '3'
  });
  
  const teamCollab = await subscrio.features.createFeature({
    key: 'team-collaboration',
    displayName: 'Team Collaboration',
    valueType: 'toggle',
    defaultValue: 'false'
  });
  
  // 3. Associate with product
  await subscrio.products.associateFeature(product.id, maxProjects.id);
  await subscrio.products.associateFeature(product.id, teamCollab.id);
  
  // 4. Renewal cycles
  const monthly = await subscrio.renewalCycles.createRenewalCycle({
    key: 'monthly',
    displayName: 'Monthly',
    durationValue: 1,
    durationUnit: 'months'
  });
  
  // 5. Plans
  const freePlan = await subscrio.plans.createPlan({
    productId: product.id,
    key: 'free',
    displayName: 'Free',
    defaultRenewalCycleId: monthly.id
  });
  
  await subscrio.plans.setFeatureValue(freePlan.id, maxProjects.id, '3');
  await subscrio.plans.setFeatureValue(freePlan.id, teamCollab.id, 'false');
  
  const proPlan = await subscrio.plans.createPlan({
    productId: product.id,
    key: 'professional',
    displayName: 'Professional',
    defaultRenewalCycleId: monthly.id
  });
  
  await subscrio.plans.setFeatureValue(proPlan.id, maxProjects.id, '25');
  await subscrio.plans.setFeatureValue(proPlan.id, teamCollab.id, 'true');
}
```

---

## API Reference

For complete API documentation, see [API_REFERENCE.md](./API_REFERENCE.md)

---

## Summary

Subscrio provides a complete subscription management system:

✅ **Products** organize features and plans  
✅ **Features** define capabilities with default values  
✅ **Plans** set specific values for features  
✅ **Customers** link to your app's users via externalId  
✅ **Subscriptions** connect customers to plans  
✅ **Feature Checker** resolves values with override hierarchy  
✅ **Type-safe** with full TypeScript support

Use the manual API to set up your product structure on initialization, then use the feature checker throughout your app to enforce limits.
