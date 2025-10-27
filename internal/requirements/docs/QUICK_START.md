# 🚀 Subscrio Quick Start Guide

Get up and running with Subscrio in 5 minutes!

---

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ running locally

---

## 1. Clone & Install

```bash
# Clone repository (if not already)
cd Subscrio

# Install all dependencies
npm install
```

---

## 2. Configure Database

**Ensure PostgreSQL is running on port 5432**

The project is configured to use:
```
postgresql://postgres:Backseat1!@localhost:5432/postgres
```

To use a different database:

1. Update `packages/core/.env`:
```bash
TEST_DATABASE_URL=postgresql://your-user:your-pass@localhost:5432/postgres
```

2. Update `packages/admin/.env.local` (create it):
```bash
VITE_DATABASE_URL=postgresql://your-user:your-pass@localhost:5432/subscrio
VITE_ADMIN_PASSPHRASE=admin123
```

---

## 3. Test Core Library

```bash
# Run tests (creates test databases automatically)
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Expected Result:**
```
✓ tests/e2e/products.test.ts (13 tests) 624ms
Test Files  1 passed (1)
Tests  13 passed (13)
```

---

## 4. Build Core Library

```bash
# Build the core library
npm run build
```

**Expected Result:**
```
✓ built in ~4s
dist/index.js     216.47 kB
dist/index.cjs    134.55 kB
```

---

## 5. Run Admin App

```bash
# Start development server (from server directory)
cd server
npm run dev
```

**Expected Result:**
```
VITE v5.4.20  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

---

## 6. Access Admin Interface

1. **Open Browser:** http://localhost:3000

2. **Login:**
   - Passphrase: `admin123` (or your configured one)

3. **Start Managing:**
   - Create Products
   - Define Features
   - Set up Plans
   - Add Customers
   - Create Subscriptions

---

## 🎯 What You Can Do Now

### Via Core Library (TypeScript)

```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL
  }
});

// Initialize schema
await subscrio.installSchema('admin123');

// Create a product
const product = await subscrio.products.createProduct({
  key: 'saas-platform',
  displayName: 'SaaS Platform'
});

// Create a feature
const feature = await subscrio.features.createFeature({
  key: 'max-projects',
  displayName: 'Max Projects',
  valueType: 'numeric',
  defaultValue: '5'
});

// Create a plan
const plan = await subscrio.plans.createPlan({
  productId: product.id,
  key: 'pro',
  displayName: 'Pro Plan'
});

// Set feature value for plan
await subscrio.plans.setFeatureValue(plan.id, feature.id, '100');

// Create a customer
const customer = await subscrio.customers.createCustomer({
  externalId: 'user_123',
  displayName: 'John Doe',
  email: 'john@example.com'
});

// Create subscription
const subscription = await subscrio.subscriptions.createSubscription({
  customerExternalId: customer.externalId,
  planId: plan.id,
  autoRenew: true
});

// Check feature access
const maxProjects = await subscrio.featureChecker.getValue(
  'user_123',
  'max-projects'
);
console.log(`User can create ${maxProjects} projects`);

// Close connections
await subscrio.close();
```

### Via Admin App (Web UI)

1. **Products Tab**
   - Create "SaaS Platform" product
   - Click to manage

2. **Features Tab**
   - Create "Max Projects" feature (numeric, default: 5)
   - Create "Advanced Analytics" feature (toggle, default: false)

3. **Plans Tab**
   - Create "Basic" plan (max-projects: 10)
   - Create "Pro" plan (max-projects: 100, analytics: true)

4. **Customers Tab**
   - Add customer with external ID
   - Link to Stripe customer ID (optional)

5. **Subscriptions Tab**
   - Create subscription for customer + plan
   - View feature overrides
   - Cancel subscriptions

6. **Feature Checker Tab**
   - Enter customer ID and feature key
   - See resolved value based on hierarchy
   - Check all features at once

---

## 🧪 Development Workflow

### Make Changes to Core

```bash
# 1. Make changes to core.typescript/src/...

# 2. Run tests
cd core.typescript
npm test

# 3. Build
npm run build
```

### Make Changes to Admin

```bash
# 1. Make changes to server/src/admin/...

# 2. Hot reload is automatic (Vite dev server)

# 3. Build for production
cd server
npm run build
```

---

## 📚 Key Concepts

### Feature Resolution
Features are resolved in this order:
1. **Subscription Override** (e.g., give user temporary boost)
2. **Plan Value** (e.g., Pro plan gets 100 projects)
3. **Feature Default** (e.g., default is 5 projects)

### Customer Flow
```
Customer → Subscription → Plan → Features
```

### Database Schema
- Automatically created on first run
- Uses Drizzle ORM migrations
- PostgreSQL native features (JSONB, timestamps)

---

## 🐛 Troubleshooting

### Tests Failing - Database Connection

**Issue:** `password authentication failed for user "postgres"`

**Fix:**
1. Check PostgreSQL is running
2. Update `packages/core/.env` with correct credentials

### Admin App Won't Start

**Issue:** `Failed to initialize Subscrio`

**Fix:**
1. Create `packages/admin/.env.local` with `VITE_DATABASE_URL`
2. Ensure database is accessible
3. Check browser console for specific error

### Build Errors

```bash
# Clean install
rm -rf node_modules core.typescript/node_modules server/node_modules
npm install

# Clean build
rm -rf core.typescript/dist server/dist
npm run build
```

---

## 📖 Documentation

- `requirements/requirements.md` - Full specification
- `packages/core/README.md` - Core library docs
- `packages/admin/README.md` - Admin app docs
- `BUILD_STATUS.md` - Implementation status
- `COMPLETION_SUMMARY.md` - What's been built

---

## 🎉 You're All Set!

The system is fully functional and ready to use. Start by running the admin app and creating your first product!

**Questions?** Check the requirements document for detailed specifications.

**Happy subscription managing!** 🚀

