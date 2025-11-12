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

// Create a product with features
const product = await subscrio.products.createProduct({
  key: 'my-saas',
  displayName: 'My SaaS Product'
});

const feature = await subscrio.features.createFeature({
  key: 'max-users',
  displayName: 'Maximum Users',
  valueType: 'numeric',
  defaultValue: '10'
});

// Associate feature with product
await subscrio.products.associateFeature(product.id, feature.id);

// Create a plan with feature values
const plan = await subscrio.plans.createPlan({
  productId: product.id,
  key: 'pro-plan',
  displayName: 'Pro Plan'
});

await subscrio.plans.setFeatureValue(plan.id, feature.id, '100');

// Create a customer and subscription
const customer = await subscrio.customers.createCustomer({
  externalId: 'customer-123',
  displayName: 'Acme Corp'
});

const subscription = await subscrio.subscriptions.createSubscription({
  customerExternalId: customer.externalId,
  planId: plan.id
});

// Check feature access
const maxUsers = await subscrio.featureChecker.getValue(
  customer.externalId,
  'max-users'
);
console.log(`Customer can have ${maxUsers} users`); // "100"
```

## API Reference

### Core Services

- **`subscrio.products`** - Product management
- **`subscrio.features`** - Feature flag management  
- **`subscrio.plans`** - Subscription plan management
- **`subscrio.customers`** - Customer management
- **`subscrio.subscriptions`** - Subscription lifecycle
- **`subscrio.featureChecker`** - Feature access checking
- **`subscrio.stripe`** - Stripe integration

## Configuration

```typescript
import { Subscrio } from '@saas-experts/subscrio';

const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY // Optional
  }
});
```

## Feature Resolution Hierarchy

Subscrio uses a smart hierarchy for feature values:

1. **Subscription Override** (highest priority)
2. **Plan Value** 
3. **Feature Default** (fallback)

```typescript
// Check if feature is enabled
const isEnabled = await subscrio.featureChecker.isEnabled(
  'customer-123',
  'advanced-analytics'
);

// Get feature value
const maxProjects = await subscrio.featureChecker.getValue(
  'customer-123', 
  'max-projects'
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
  CreateProductDto, 
  ProductDto,
  FeatureValueType,
  SubscriptionStatus 
} from '@saas-experts/subscrio';

// All APIs are fully typed
const product: ProductDto = await subscrio.products.createProduct({
  key: 'my-product',
  displayName: 'My Product'
});
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/Saas-Experts-Co/subscrio/blob/main/CONTRIBUTING.md) for details.

## Support

- 📖 [Documentation](https://github.com/Saas-Experts-Co/subscrio#readme)
- 🐛 [Report Issues](https://github.com/Saas-Experts-Co/subscrio/issues)
- 💬 [Discussions](https://github.com/Saas-Experts-Co/subscrio/discussions)