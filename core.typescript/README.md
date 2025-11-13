# @saas-experts/subscrio

A comprehensive TypeScript library for subscription management, feature flags, billing cycles, and Stripe integration.

[![npm version](https://badge.fury.io/js/@saas-experts%2Fsubscrio.svg)](https://badge.fury.io/js/@saas-experts%2Fsubscrio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Feature Flags & Entitlements** - Granular feature control with subscription-based access
- 💳 **Billing Management** - Flexible billing cycles, plans, and pricing models
- 🔄 **Subscription Lifecycle** - Complete subscription management from trial to renewal
- 🏷️ **Stripe Integration** - Seamless payment processing and webhook handling
- 🗄️ **PostgreSQL Ready** - Built on Drizzle ORM with full type safety
- 📊 **Feature Resolution** - Smart hierarchy: subscription overrides → plan values → defaults
- 🔐 **API Key Management** - Secure API access with scoped permissions
- ⚡ **TypeScript First** - Full type safety and excellent developer experience

## Installation

```bash
npm install @saas-experts/subscrio
```

**Prerequisites:**
- Node.js 18+
- PostgreSQL database

## Quick Start

```typescript
import { Subscrio } from '@saas-experts/subscrio';

// Initialize the library
const subscrio = new Subscrio({
  database: {
    connectionString: 'postgresql://user:password@localhost:5432/mydb'
  }
});

// Install database schema (first time only)
await subscrio.installSchema();

// Create a product
const product = await subscrio.products.createProduct({
  key: 'my-saas',
  displayName: 'My SaaS Product'
});

// Create a feature
const feature = await subscrio.features.createFeature({
  key: 'max-users',
  displayName: 'Maximum Users',
  valueType: 'numeric',
  defaultValue: '10'
});

// Associate feature with product (using keys, not IDs)
await subscrio.products.associateFeature(product.key, feature.key);

// Create a plan (using productKey, not productId)
const plan = await subscrio.plans.createPlan({
  productKey: product.key,
  key: 'pro-plan',
  displayName: 'Pro Plan'
});

// Set feature value on plan (using keys, not IDs)
await subscrio.plans.setFeatureValue(plan.key, feature.key, '100');

// Create a billing cycle for the plan (required for subscriptions)
const billingCycle = await subscrio.billingCycles.createBillingCycle({
  planKey: plan.key,
  key: 'monthly',
  displayName: 'Monthly',
  durationValue: 1,
  durationUnit: 'months'
});

// Create a customer (using key, not externalId)
const customer = await subscrio.customers.createCustomer({
  key: 'customer-123',
  displayName: 'Acme Corp'
});

// Create a subscription (using keys and billingCycleKey, not IDs)
const subscription = await subscrio.subscriptions.createSubscription({
  key: 'sub-001',
  customerKey: customer.key,
  billingCycleKey: billingCycle.key
});

// Check feature access (requires customerKey, productKey, and featureKey)
const maxUsers = await subscrio.featureChecker.getValueForCustomer(
  customer.key,
  product.key,
  'max-users'
);
console.log(`Customer can have ${maxUsers} users`); // "100"
```

## API Reference

### Core Services

- **`subscrio.products`** - Product management
- **`subscrio.features`** - Feature flag management  
- **`subscrio.plans`** - Subscription plan management
- **`subscrio.billingCycles`** - Billing cycle management
- **`subscrio.customers`** - Customer management
- **`subscrio.subscriptions`** - Subscription lifecycle
- **`subscrio.featureChecker`** - Feature access checking
- **`subscrio.apiKeys`** - API key management
- **`subscrio.stripe`** - Stripe integration

### Instance Methods

- **`installSchema(adminPassphrase?)`** - Install database schema
- **`verifySchema()`** - Check if schema is installed
- **`dropSchema()`** - Drop all database tables (destructive)
- **`close()`** - Close database connections

## Configuration

```typescript
import { Subscrio } from '@saas-experts/subscrio';

const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',  // Optional
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10')  // Optional
  },
  adminPassphrase: process.env.ADMIN_PASSPHRASE,  // Optional, min 8 chars
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY  // Optional
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'  // Optional
  }
});
```

## Feature Resolution Hierarchy

Subscrio uses a smart hierarchy for feature values:

1. **Subscription Override** (highest priority)
2. **Plan Value** 
3. **Feature Default** (fallback)

```typescript
// Check if feature is enabled for a customer in a product
const isEnabled = await subscrio.featureChecker.isEnabledForCustomer(
  'customer-123',  // customerKey
  'my-saas',       // productKey
  'advanced-analytics'  // featureKey
);

// Get feature value for a customer in a product
const maxProjects = await subscrio.featureChecker.getValueForCustomer(
  'customer-123',  // customerKey
  'my-saas',       // productKey
  'max-projects'   // featureKey
);

// Get feature value for a specific subscription
const value = await subscrio.featureChecker.getValueForSubscription(
  'sub-001',       // subscriptionKey
  'max-projects'   // featureKey
);
```

## Stripe Integration

```typescript
// Process Stripe webhooks (implementor handles verification)
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  await subscrio.stripe.processStripeEvent(event);
  res.json({received: true});
});
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { 
  Subscrio, 
  SubscrioConfig,
  CreateProductDto, 
  ProductDto,
  CreateFeatureDto,
  FeatureDto,
  CreatePlanDto,
  PlanDto,
  CreateBillingCycleDto,
  BillingCycleDto,
  CreateCustomerDto,
  CustomerDto,
  CreateSubscriptionDto,
  SubscriptionDto
} from '@saas-experts/subscrio';

// All APIs are fully typed
const product: ProductDto = await subscrio.products.createProduct({
  key: 'my-product',
  displayName: 'My Product'
});
```

### Key Concepts

**Keys vs IDs**: All public APIs use **keys** (string identifiers like `'my-product'`) rather than internal IDs. Keys are:
- Human-readable and memorable
- Globally unique within their scope
- Immutable once created
- Used in all method calls and references

**DTOs**: All create/update operations use DTOs (Data Transfer Objects) with Zod validation:
- `CreateProductDto`, `CreateFeatureDto`, `CreatePlanDto`, etc.
- All fields are validated before processing
- Type-safe with full TypeScript inference

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/Saas-Experts-Co/subscrio/blob/main/CONTRIBUTING.md) for details.

## Support

- 📖 [Documentation](https://github.com/Saas-Experts-Co/subscrio#readme)
- 🐛 [Report Issues](https://github.com/Saas-Experts-Co/subscrio/issues)
- 💬 [Discussions](https://github.com/Saas-Experts-Co/subscrio/discussions)