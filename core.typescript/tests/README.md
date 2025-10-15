# Subscrio Testing Guide

Complete guide for testing @subscrio/core using end-to-end tests with real PostgreSQL databases.

## Philosophy

**We test the PUBLIC API with REAL databases. No mocks.**

- Test complete workflows end-to-end
- Each test suite gets a fresh PostgreSQL database
- Test actual behavior, not implementation details
- Focus on the public API that users will call

## Test Framework

**Vitest** - Fast, TypeScript-native testing framework

## Requirements

- **Local Development**: PostgreSQL 15+ installed and running
- **CI/CD**: Docker PostgreSQL container
- **Minimum Coverage**: 80% for all public API methods

## Quick Start

### 1. Install PostgreSQL

**macOS (Homebrew)**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian**:
```bash
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

**Windows**:
Download from postgresql.org and install

### 2. Run Tests

```bash
cd packages/core
pnpm test
```

### 3. Watch Mode

```bash
pnpm test:watch
```

### 4. Coverage Report

```bash
pnpm test:coverage
```

## Test Structure

```
tests/
├── setup/
│   ├── database.ts      # Database creation/teardown
│   ├── fixtures.ts      # Test data factories
│   └── vitest-setup.ts  # Global test setup
└── e2e/
    ├── products.test.ts
    ├── features.test.ts
    ├── plans.test.ts
    ├── customers.test.ts
    ├── api-keys.test.ts
    ├── subscriptions.test.ts
    ├── billing-cycles.test.ts
    ├── feature-checker.test.ts    # CRITICAL - test resolution hierarchy
    └── stripe-integration.test.ts
```

## Database Setup Pattern

Each test file follows this pattern:

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Subscrio } from '@subscrio/core';
import { setupTestDatabase, teardownTestDatabase } from '../setup/database';

describe('Entity E2E Tests', () => {
  let subscrio: Subscrio;
  let dbName: string;
  
  beforeAll(async () => {
    const context = await setupTestDatabase();
    subscrio = context.subscrio;
    dbName = context.dbName;
  });
  
  afterAll(async () => {
    await teardownTestDatabase(dbName);
  });

  test('does something', async () => {
    // Test using subscrio.* public API
  });
});
```

### Database Setup Utility

**`tests/setup/database.ts`:**
```typescript
import { randomUUID } from 'crypto';
import { Client } from 'pg';
import { Subscrio } from '@subscrio/core';

export interface TestContext {
  dbName: string;
  connectionString: string;
  subscrio: Subscrio;
}

export async function setupTestDatabase(): Promise<TestContext> {
  // Generate unique database name
  const dbName = `subscrio_test_${randomUUID().replace(/-/g, '')}`;
  
  // Connect to postgres database to create test DB
  const adminClient = new Client({
    connectionString: process.env.TEST_DATABASE_URL || 
      'postgresql://postgres:postgres@localhost:5432/postgres'
  });
  
  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE ${dbName}`);
  await adminClient.end();
  
  // Build connection string for test database
  const baseUrl = process.env.TEST_DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/postgres';
  const connectionString = baseUrl.replace(/\/[^/]*$/, `/${dbName}`);
  
  // Initialize Subscrio with test database
  const subscrio = new Subscrio({
    database: { connectionString }
  });
  
  // Install schema using public API
  await subscrio.installSchema();
  
  return { dbName, connectionString, subscrio };
}

export async function teardownTestDatabase(dbName: string): Promise<void> {
  const adminClient = new Client({
    connectionString: process.env.TEST_DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/postgres'
  });
  
  await adminClient.connect();
  
  // Terminate connections and drop database
  await adminClient.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid()
  `);
  
  await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await adminClient.end();
}
```

## Public API Test Coverage

Every public method must have tests:

### Subscrio Main Class
- `new Subscrio(config)`
- `installSchema()`
- `verifySchema()`
- `dropSchema()`
- `close()`

### ProductManagementService (`subscrio.products`)
- `createProduct()`
- `updateProduct()`
- `deleteProduct()`
- `archiveProduct()`
- `getProduct()`
- `getProductByKey()`
- `listProducts()`
- `associateFeature()`
- `dissociateFeature()`

### FeatureManagementService (`subscrio.features`)
- `createFeature()`
- `updateFeature()`
- `deleteFeature()`
- `archiveFeature()`
- `unarchiveFeature()`
- `getFeature()`
- `listFeatures()`
- `getFeaturesByProduct()`

### PlanManagementService (`subscrio.plans`)
- `createPlan()`
- `updatePlan()`
- `deletePlan()`
- `archivePlan()`
- `getPlan()`
- `listPlans()`
- `setFeatureValue()`
- `removeFeatureValue()`
- `getPlanWithFeatures()`

### CustomerManagementService (`subscrio.customers`)
- `createCustomer()`
- `updateCustomer()`
- `deleteCustomer()`
- `suspendCustomer()`
- `activateCustomer()`
- `getCustomer()`
- `listCustomers()`

### APIKeyManagementService (`subscrio.apiKeys`)
- `createAPIKey()`
- `revokeAPIKey()`
- `getAPIKey()`
- `listAPIKeys()`
- `validateAPIKey()`

### SubscriptionManagementService (`subscrio.subscriptions`)
- `createSubscription()`
- `cancelSubscription()`
- `getSubscription()`
- `listSubscriptions()`
- `getCustomerSubscriptions()`
- `addFeatureOverride()`
- `removeFeatureOverride()`

### BillingCycleManagementService (`subscrio.billingCycles`)
- `createBillingCycle()`
- `updateBillingCycle()`
- `deleteBillingCycle()`
- `getBillingCycle()`
- `listBillingCycles()`
- `processRenewals()`

### FeatureCheckerService (`subscrio.featureChecker`) - **CRITICAL**
- `isEnabled(customerKey, featureKey)`
- `getValue(customerKey, featureKey)`
- `getAllFeatures(customerKey)`

### StripeIntegrationService (`subscrio.stripe`)
- `processStripeEvent(event)`
- `syncSubscriptionFromStripe()`

## Example Test: Feature Resolution Hierarchy

This is the **most critical test** - it verifies the core feature resolution logic:

```typescript
describe('Feature Resolution Hierarchy', () => {
  test('resolves from subscription override > plan value > feature default', async () => {
    // 1. Create product
    const product = await subscrio.products.createProduct({
      key: 'test-product',
      displayName: 'Test Product'
    });

    // 2. Create feature with default value
    const feature = await subscrio.features.createFeature({
      key: 'max-projects',
      displayName: 'Max Projects',
      valueType: 'numeric',
      defaultValue: '10'
    });

    // 3. Associate feature with product
    await subscrio.products.associateFeature(product.id, feature.id);

    // 4. Create plan and set feature value
    const plan = await subscrio.plans.createPlan({
      productKey: product.key,
      key: 'pro',
      displayName: 'Pro Plan'
    });
    await subscrio.plans.setFeatureValue(plan.id, feature.id, '50');

    // 5. Create customer
    const customer = await subscrio.customers.createCustomer({
      key: 'test-customer'
    });

    // 6. Create subscription
    const subscription = await subscrio.subscriptions.createSubscription({
      customerKey: customer.key,
      planId: plan.id,
      billingCycleId: cycle.id
    });

    // TEST: Should resolve from plan value
    let value = await subscrio.featureChecker.getValue(customer.key, 'max-projects');
    expect(value).toBe('50');

    // 7. Add subscription override
    await subscrio.subscriptions.addFeatureOverride(
      subscription.id,
      feature.id,
      '100',
      'permanent'
    );

    // TEST: Should now resolve from subscription override
    value = await subscrio.featureChecker.getValue(customer.key, 'max-projects');
    expect(value).toBe('100');

    // 8. Remove override
    await subscrio.subscriptions.removeFeatureOverride(subscription.id, feature.id);

    // TEST: Should fall back to plan value
    value = await subscrio.featureChecker.getValue(customer.key, 'max-projects');
    expect(value).toBe('50');

    // 9. Remove plan feature value
    await subscrio.plans.removeFeatureValue(plan.id, feature.id);

    // TEST: Should fall back to feature default
    value = await subscrio.featureChecker.getValue(customer.key, 'max-projects');
    expect(value).toBe('10');
  });
});
```

## Test Fixtures

Use the fixtures helper to create test data quickly:

**`tests/setup/fixtures.ts`:**
```typescript
import { Subscrio } from '@subscrio/core';

export class TestFixtures {
  constructor(private readonly subscrio: Subscrio) {}

  async createProduct(overrides = {}) {
    return this.subscrio.products.createProduct({
      key: `product-${Date.now()}`,
      displayName: 'Test Product',
      ...overrides
    });
  }

  async createFeature(overrides = {}) {
    return this.subscrio.features.createFeature({
      key: `feature-${Date.now()}`,
      displayName: 'Test Feature',
      valueType: 'toggle',
      defaultValue: 'false',
      ...overrides
    });
  }

  async createCustomer(overrides = {}) {
    return this.subscrio.customers.createCustomer({
      key: `customer-${Date.now()}`,
      ...overrides
    });
  }

  // Add more helpers as needed...
}
```

## Configuration

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/index.ts'
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    poolOptions: {
      threads: {
        singleThread: true // Avoid DB conflicts
      }
    }
  }
});
```

## CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
```

## Troubleshooting

### "Database does not exist"
```bash
createdb postgres
# Or set TEST_DATABASE_URL to an existing database
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

### "Connection refused"
- Ensure PostgreSQL is running: `brew services start postgresql@15` (macOS)
- Check PostgreSQL is listening on port 5432
- Verify credentials match your local setup

### "Permission denied to create database"
- Ensure your PostgreSQL user has CREATEDB privilege
- Run: `ALTER USER postgres CREATEDB;`

### Tests hang or timeout
- Check for unclosed database connections
- Ensure `afterAll` cleanup is running
- Try running tests sequentially (already configured via `singleThread`)

### "Too many connections"
- PostgreSQL may have connection limit reached
- Check active connections: `SELECT count(*) FROM pg_stat_activity;`
- Terminate zombie connections from failed test runs

## Best Practices

1. **Test Behavior, Not Implementation**
   - Call public API methods
   - Assert on outcomes
   - Don't test internal repository or domain service methods directly

2. **Use Real Data**
   - Don't mock the database
   - Use fixtures to create test data
   - Each test starts with a clean database

3. **Descriptive Test Names**
   ```typescript
   test('throws ConflictError when creating product with duplicate key', async () => {
     // ...
   });
   ```

4. **Test Error Cases**
   ```typescript
   await expect(
     subscrio.products.createProduct({ key: 'existing-key' })
   ).rejects.toThrow(ConflictError);
   ```

5. **Keep Tests Fast**
   - Run in parallel where possible
   - Use database transactions for faster cleanup (if needed)
   - Don't sleep/wait unnecessarily

6. **Cover All Public Methods**
   - Every method in `subscrio.*` namespace
   - Success paths
   - Error paths
   - Edge cases

## Monitoring Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**Target**: 80% minimum coverage for:
- Lines
- Functions
- Branches
- Statements

## Writing New Tests

When adding a new feature:

1. Add test file in `tests/e2e/`
2. Follow the database setup pattern
3. Test all public methods
4. Test success and error cases
5. Test business rule enforcement
6. Update this README if needed

**Example template:**
```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Subscrio } from '@subscrio/core';
import { setupTestDatabase, teardownTestDatabase } from '../setup/database';

describe('NewFeature E2E Tests', () => {
  let subscrio: Subscrio;
  let dbName: string;
  
  beforeAll(async () => {
    ({ subscrio, dbName } = await setupTestDatabase());
  });
  
  afterAll(async () => {
    await teardownTestDatabase(dbName);
  });

  test('creates new thing successfully', async () => {
    const thing = await subscrio.things.createThing({
      name: 'Test Thing'
    });
    
    expect(thing).toBeDefined();
    expect(thing.name).toBe('Test Thing');
  });

  test('throws ValidationError for invalid data', async () => {
    await expect(
      subscrio.things.createThing({ name: '' })
    ).rejects.toThrow('ValidationError');
  });
});
```

## Support

- See main [README.md](../README.md) for project setup
- See [requirements.md](../../../requirements/requirements.md) for specifications
- Run `pnpm test:watch` for interactive testing during development

