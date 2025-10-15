# @subscrio/core

Core library for Subscrio - a TypeScript/Node.js library for managing SaaS subscriptions, features, and plans.

## Documentation

📚 **[How to Use Guide](./HOW_TO_USE.md)** - Start here for integration examples and usage patterns  
📖 **[API Reference](./API_REFERENCE.md)** - Complete API documentation with all data structures and methods  
🔧 **This README** - Development status and contribution guide

---

## Architecture

This library follows Domain-Driven Design (DDD) principles with three main layers:

### Domain Layer (`src/domain/`)
- **Entities**: Product, Feature, Plan, Customer, APIKey, Subscription, RenewalCycle, SystemConfig
- **Value Objects**: Enums for statuses and types
- **Domain Services**: FeatureValueResolver, SubscriptionRenewalService

### Application Layer (`src/application/`)
- **DTOs**: Input/output data transfer objects with Zod validation
- **Mappers**: Transform between database records, domain entities, and DTOs
- **Repository Interfaces**: Define contracts for data access
- **Services**: Business logic orchestration

### Infrastructure Layer (`src/infrastructure/`)
- **Database**: Drizzle ORM with PostgreSQL
- **Repository Implementations**: Concrete implementations of repository interfaces
- **Utilities**: UUID generation, configuration

## Installation

```bash
npm install @subscrio/core
```

## Quick Start

```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL
  },
  adminPassphrase: process.env.ADMIN_PASSPHRASE
});

// Install schema (first time only)
await subscrio.installSchema();

// Use the API
const product = await subscrio.products.createProduct({
  key: 'my-product',
  displayName: 'My Product'
});
```

📖 **For complete usage examples, startup patterns, and integration guides, see [HOW_TO_USE.md](./HOW_TO_USE.md)**

## Development Status

### Completed Components

✅ **Domain Layer**:
- Base Entity class
- All 10 value objects (enums)
- All 8 domain entities with business logic
- 2 domain services (FeatureValueResolver, SubscriptionRenewalService)

✅ **Application Layer - DTOs & Mappers**:
- 8 complete DTO sets with Zod schemas (Product, Feature, Plan, Customer, APIKey, Subscription, RenewalCycle)
- 8 complete mappers for all entities
- All 7 repository interfaces
- Custom error classes

✅ **Application Layer - Services**:
- ProductManagementService (complete)

✅ **Infrastructure**:
- Complete Drizzle schema with all 11 tables
- Database connection and schema installer
- UUID generator
- Configuration loader
- DrizzleProductRepository (complete implementation)

✅ **Main Library**:
- Subscrio main class (with Product service integrated)
- Public API exports

✅ **Testing**:
- Vitest configuration
- Test database setup/teardown utilities
- Complete E2E test suite for Products

### Remaining Work

The following components need to be implemented following the established patterns:

🔲 **Application Services** (8 remaining):
- FeatureManagementService
- PlanManagementService
- CustomerManagementService
- APIKeyManagementService
- SubscriptionManagementService
- RenewalCycleManagementService
- StripeIntegrationService
- FeatureCheckerService

🔲 **Repository Implementations** (6 remaining):
- DrizzleFeatureRepository
- DrizzlePlanRepository
- DrizzleCustomerRepository
- DrizzleAPIKeyRepository
- DrizzleSubscriptionRepository
- DrizzleRenewalCycleRepository

🔲 **E2E Tests** (8 remaining):
- features.test.ts
- plans.test.ts
- customers.test.ts
- api-keys.test.ts
- subscriptions.test.ts
- renewal-cycles.test.ts
- feature-checker.test.ts (critical)
- stripe-integration.test.ts

## Testing

### Prerequisites

**PostgreSQL must be running** on localhost:5432 with credentials `postgres/postgres`.

### Run Tests

```bash
# Just run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Default Connection String

Tests use: `postgresql://postgres:postgres@localhost:5432/postgres`

If your PostgreSQL uses different credentials, set:
```bash
$env:TEST_DATABASE_URL = "postgresql://your_user:your_password@localhost:5432/postgres"
```

📖 **See [TESTING.md](./TESTING.md) for troubleshooting**

## Building

```bash
# Build library
pnpm build

# Type check
pnpm typecheck
```

## License

MIT

