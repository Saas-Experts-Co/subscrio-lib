# Subscrio - Requirements Document

## Licensing & Distribution Model

### Core Open Source + API/Admin Closed/Paid

**Distribution Strategy:**

1. **`@subscrio/core` - Open Source (MIT License)**
   - Public GitHub repository
   - Free npm package
   - Full TypeScript library for subscription management
   - Anyone can use, modify, and build upon it
   - Marketing and community adoption driver

2. **`@subscrio/api` - Closed Source (Paid License)**
   - Private GitHub repository or npm registry
   - Requires paid license to access and use
   - Pre-built REST API server with all endpoints
   - Includes license key validation on startup
   - Subscription or one-time purchase

3. **`@subscrio/admin` - Closed Source (Paid License)**
   - Private GitHub repository or npm registry
   - Requires paid license to access
   - Professional React admin interface
   - No runtime license validation (protected by API requirement)
   - Bundled with API or sold separately

### License Key System (API Only)

**Purpose:** Enforce payment for the API server, not the React UI

**Implementation:**
```typescript
// packages/api/src/index.ts
// On API server startup - validates license key
const licenseKey = process.env.SUBSCRIO_LICENSE_KEY;
if (!licenseKey) {
  throw new Error('SUBSCRIO_LICENSE_KEY required. Purchase at subscrio.com');
}

const license = verifyLicenseSignature(licenseKey);
if (!license.valid) {
  throw new Error('Invalid Subscrio license key');
}

// For subscription model - check expiration
if (license.expiresAt && license.expiresAt < new Date()) {
  throw new Error('License expired. Renew at subscrio.com');
}
```

**License Key Features:**
- Cryptographically signed (offline validation)
- Embeds customer email
- Optional expiration date (for subscription model)
- No "phone home" required (builds trust)
- Verified on API server startup only

**Admin App Protection:**
- No runtime license validation (can't be enforced in browser)
- Protected by: Private repo access + useless without working API
- API is the enforcement chokepoint

### What Customers Get

**One-Time Purchase ($299-399):**
- Private GitHub repo access to API + Admin
- License key for API server
- Perpetual use of current version
- 1 year of updates included
- After 1 year: optional $99/year for continued updates

**Subscription ($49-69/month):**
- Private GitHub repo access
- License key (expires with subscription)
- Continuous updates
- Support via email/Slack

**Enterprise (Custom pricing):**
- Everything in subscription
- Managed hosting option
- Priority support
- Custom integrations
- SLA guarantees

### Value Proposition

**What you're selling:**
- ⏱️ Time savings - Pre-built API + Admin (120+ hours of dev work)
- 🎨 Professional polish - Production-ready, tested, accessible
- 🔄 Continuous updates - Bug fixes, new features, security patches
- 📞 Support - Help when stuck
- ✅ Legal license - Right to use in commercial products
- 🔐 Working API - Won't run without license key

**Not selling:**
- Technical DRM (impossible for client-side code)
- Obfuscated code
- Phone-home licensing

### API Authentication Requirements

**ALL** `/api/*` endpoints require `X-API-Key` header with valid API key (except `/openapi.json`).

**Authentication Flow**:
1. Client sends request with `X-API-Key` header
2. Middleware queries `api_keys` table and validates: exists, active (not revoked), not expired
3. Returns 401 Unauthorized if invalid
4. Proceeds to route handler if valid

**API Key Scopes**:
- `admin`: Full CRUD access (GET, POST, PUT, DELETE)
- `readonly`: Read-only access (GET only, 403 for others)

**Key Management**:
- Plaintext key shown ONCE at creation
- Stored as hashed value in database
- Can be revoked (sets status to 'revoked')
- Optional expiration date
- Updates `last_used_at` timestamp on each use

**Security Requirements**:
- Keys must be stored in environment variables, never in version control or client-side code
- Admin-scoped keys only for backend services
- Readonly-scoped keys for analytics/reporting/monitoring
- Support key rotation (revoke old, create new)
- Support expiration dates for temporary keys
- Track usage via `last_used_at` timestamp

> **📘 For middleware implementation, testing, and usage examples, see `packages/api/README.md`**

---

## Package Structure

**Three npm packages:**
- `@subscrio/core` - Core library with DDD layers (Open Source)
- `@subscrio/api` - REST API wrapper (Closed Source, Paid)
- `@subscrio/admin` - Admin web application (Closed Source, Paid)

---

## Technology Stack

Subscrio is a monorepo-based TypeScript library for SaaS subscription and feature management using:
- **PNPM workspaces** for monorepo management
- **Vite** for fast builds across all packages
- **Vitest** for end-to-end testing with real PostgreSQL
- **Drizzle ORM** for type-safe database access
- **DDD architecture** with clear separation of concerns
- **Three packages**: `@subscrio/core` (library), `@subscrio/api` (REST wrapper), `@subscrio/admin` (React UI)

The admin app imports core directly (no HTTP), tests use real databases (no mocks), and the entire system is designed for type safety, testability, and maintainability.

---

# Subscrio - Requirements Document

## Executive Summary

A TypeScript/Node.js library and admin application for SaaS companies to manage features, plans (editions), and customer subscriptions. The system provides a programmatic API and visual admin interface for defining feature sets, creating pricing plans with feature values, managing customer subscriptions to plans, and integrating with Stripe for billing.

**Project Name**: Subscrio

## System Overview

### Core Components

1. **Subscrio Library** (`@subscrio/core`) - TypeScript/Node.js package for programmatic access
2. **REST API Wrapper** (`@subscrio/api`) - Express.js REST API exposing library functionality
3. **Admin Application** (`@subscrio/admin`) - React-based web UI for visual configuration

### Key Differentiators

- Not a feature flag system - focused on plan/edition management with feature value resolution
- Products organize features and plans into logical business units
- Subscriptions manage the customer-to-plan relationship with full lifecycle tracking
- Shared database model between implementor's app and management system
- Built-in Stripe integration for billing workflows
- API key authentication for all REST API access

### Technical Standards

- **All IDs**: UUIDv7 generated by the application
- **Database**: PostgreSQL with Drizzle ORM
- **Architecture**: Domain-Driven Design (DDD) with clear layer separation

## Domain Model & Requirements

### 1. Products

**Purpose**: Represent distinct SaaS products or applications that have their own feature sets. Products organize features and plans into logical groups.

**Requirements**:
- Unique product key/name (string identifier)
- Display name and description
- Product status (active/inactive/archived)
- Metadata for custom properties
- Created/updated timestamps

**Business Rules**:
- Products are the top-level organizational unit
- Each product has its own set of features
- Plans belong to a product and can only set values for that product's features
- Products can be archived but not deleted if they have associated plans or features
- Multiple products can exist in the same system (e.g., "Project Management", "Time Tracking", "CRM")

---

## 🔷 REFERENCE IMPLEMENTATION PATTERN

**The following Product entity demonstrates the complete DDD pattern used throughout Subscrio. All other entities follow this same structure.**

### Domain Entity (`packages/core/src/domain/entities/Product.ts`):
```typescript
import { Entity } from '../base/Entity';
import { ProductStatus } from '../value-objects/ProductStatus';

export interface ProductProps {
  key: string;
  displayName: string;
  description?: string;
  status: ProductStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends Entity<ProductProps> {
  get key(): string {
    return this.props.key;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  activate(): void {
    this.props.status = ProductStatus.Active;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.status = ProductStatus.Inactive;
    this.props.updatedAt = new Date();
  }

  archive(): void {
    this.props.status = ProductStatus.Archived;
    this.props.updatedAt = new Date();
  }

  canDelete(): boolean {
    // Domain rule: Can't delete if has associated plans/features
    // This check will be done by the domain service
    return this.props.status === ProductStatus.Archived;
  }
}
```

**DTO** (`packages/core/src/application/dtos/ProductDto.ts`):
```typescript
import { z } from 'zod';

export const CreateProductDtoSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(255),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type CreateProductDto = z.infer<typeof CreateProductDtoSchema>;

export const UpdateProductDtoSchema = CreateProductDtoSchema.partial();
export type UpdateProductDto = z.infer<typeof UpdateProductDtoSchema>;

export interface ProductDto {
  id: string;
  key: string;
  displayName: string;
  description?: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
```

**Mapper** (`packages/core/src/application/mappers/ProductMapper.ts`):
```typescript
import { Product, ProductProps } from '../../domain/entities/Product';
import { ProductDto } from '../dtos/ProductDto';
import { ProductStatus } from '../../domain/value-objects/ProductStatus';

export class ProductMapper {
  static toDto(product: Product): ProductDto {
    return {
      id: product.id,
      key: product.key,
      displayName: product.displayName,
      description: product.props.description,
      status: product.status,
      metadata: product.props.metadata,
      createdAt: product.props.createdAt.toISOString(),
      updatedAt: product.props.updatedAt.toISOString()
    };
  }

  static toDomain(raw: any): Product {
    return new Product(
      {
        key: raw.key,
        displayName: raw.display_name,
        description: raw.description,
        status: raw.status as ProductStatus,
        metadata: raw.metadata,
        createdAt: new Date(raw.created_at),
        updatedAt: new Date(raw.updated_at)
      },
      raw.id
    );
  }

  static toPersistence(product: Product): any {
    return {
      id: product.id,
      key: product.key,
      display_name: product.displayName,
      description: product.props.description,
      status: product.status,
      metadata: product.props.metadata,
      created_at: product.props.createdAt,
      updated_at: product.props.updatedAt
    };
  }
}
```

**Note**: All other entities (Features, Plans, Customers, APIKeys, Subscriptions, BillingCycles) follow this exact same pattern. Refer to this Product example when implementing them.

---

### 2. Features

**Purpose**: Define individual capabilities or functionality units with their default values. Features can be associated with multiple products and are the building blocks that plans configure.

**Requirements**:
- Unique feature key/name (string identifier) - globally unique
- Display name and description
- Feature value type: **Toggle** (boolean), **Numeric** (integers), **Text** (free text)
- **Default value** (used if feature not set at plan level)
- Grouping/categorization capability
- Value type validator configuration (e.g., min/max for numeric)
- Feature status (active/archived)
- Display order for UI presentation
- Metadata for custom properties
- **Product associations** (many-to-many relationship via junction table)

**Business Rules**:
- Features are defined globally and can be reused across multiple products
- Feature keys must be globally unique
- Features define WHAT can be configured, not the actual values (except default)
- A feature's default value is only used when a plan doesn't specify a value
- Features can be organized into groups for better UI organization
- Features can be archived (hidden from UI, can't be added to new plans or products)
- Features can only be deleted if archived AND not associated with any products
- Archived features remain functional in existing product associations and plans
- A feature must be associated with at least one product to be usable

### 3. Plans (Editions)

**Purpose**: Define subscription tiers within a product that SET specific values for that product's features. Plans are the product offerings customers subscribe to.

**Requirements**:
- Unique plan key/name (string identifier) within the product
- **Product ID** (references which product this plan belongs to)
- Display name and description
- **Feature values** (collection of feature assignments with their values for THIS plan)
  - Each feature value associates a product feature with its value in this plan
  - Plans can only set values for features belonging to their product
  - Plans only need to specify values for features they want to override from defaults
  - If a feature isn't specified in a plan, its default value is used
- Plan status (active/inactive/archived)
- **On expire transition to plan ID** (optional) - Auto-transition subscription to this plan when current subscription expires
- Display order for UI presentation
- Metadata for custom properties
- Created/updated timestamps

**Business Rules**:
- A plan belongs to exactly one product
- A plan defines a collection of feature values for its product's features
- Plans set the actual values for features (e.g., "Basic" plan sets MaxProjects to 5, "Pro" plan sets it to 50)
- Plans can only reference features that belong to the same product
- If a plan doesn't specify a value for a product feature, the feature's default value applies
- Multiple subscriptions can reference the same plan
- Plans can be deactivated but not deleted if active subscriptions exist
- Archived plans cannot be assigned to new subscriptions
- If a plan has `on_expire_transition_to_plan_id` set, when subscriptions to this plan expire, they automatically create a new subscription to the target plan

### 4. Customers (Tenants)

**Purpose**: Represent unique entities (tenant ID, customer ID, organization ID, user ID) that can have subscriptions to plans.

**Requirements**:
- **Key** (unique, text, implementor-defined external identifier) - This is the customer's unique ID from the implementor's system
- Display name (optional, for UI)
- Contact email (optional)
- External billing ID (optional, for billing integration - could be Stripe customer ID, PayPal ID, etc.)
- Customer status (active/suspended/deleted)
- Metadata for custom properties
- Created/updated timestamps

**Business Rules**:
- Customer key must be unique across the system
- The `key` field stores the external identifier from the implementor's system (e.g., their user ID, tenant ID)
- Customers can have multiple subscriptions (see Subscriptions entity)
- Customers can be associated with an external billing system via external_billing_id (separate from key)
- Soft delete support (mark as deleted but retain data)

**Note**: API methods may use parameter names like `customerExternalId` or `customerKey` - both refer to the customer's `key` field.

**Note**: Customers do NOT have a direct link to Plans. That relationship is managed through Subscriptions.

### 5. API Keys

**Purpose**: Provide secure authentication for REST API access. **ALL API endpoints require a valid API key - no exceptions.**

**Requirements**:
- Unique API key identifier (auto-generated secure token)
- Display name/description (for identifying the key's purpose)
- Key status (active/revoked)
- **Scopes/permissions** - `admin` (full CRUD) or `readonly` (GET only)
- Last used timestamp
- Expiration date (optional)
- Created by (admin user reference, optional)
- IP whitelist (optional - restrict to specific IPs)
- Metadata for custom properties
- Created/updated timestamps

**Business Rules**:
- API keys must be cryptographically secure (32+ character random string)
- **Keys are MANDATORY for ALL REST API endpoints** - No endpoint works without valid API key
- API key validation happens via middleware that checks the `api_keys` database table
- Keys can be revoked but not deleted (audit trail)
- Each key has a scope: `admin` (full CRUD) or `readonly` (GET only)
- Keys can optionally expire after a set date
- Failed authentication attempts should be logged
- Keys should be hashed when stored (show plaintext only once at creation)
- Revoked keys fail validation immediately
- Expired keys fail validation with specific error message

**CRITICAL**: The `@subscrio/api` package uses ONLY API key authentication. No other authentication methods (passphrase, OAuth, etc.) are implemented. Admin UI authentication is separate and handled by the admin app itself.

### 6. Subscriptions

**Purpose**: The central entity that ties Customers to Plans and manages the subscription lifecycle. This is the key relationship entity.

**Requirements**:
- Unique subscription ID (UUID)
- **Key** (unique, external reference identifier)
- **Customer ID** (references customer - the "who")
- **Plan ID** (references plan - the "what")
- **Billing Cycle ID** (references billing cycle - the "how often", required)
- Subscription status: `active`, `trial`, `cancelled`, `expired`, `suspended`
- **Activation date** - When subscription became active
- **Expiration date** - When subscription expires/expired (nullable for lifetime)
- **Cancellation date** - When cancellation was requested (nullable)
- **Trial end date** - When trial period ends (nullable)
- **Current period start** - Start of current billing period
- **Current period end** - End of current billing period
- Stripe subscription ID (optional, for Stripe-managed subscriptions)
- Auto-renew flag (whether to automatically renew)
- **Feature overrides** - Allow overriding specific feature values
  - Feature key
  - Overridden value
  - Override type: `permanent` or `temporary`
  - Created date
- Metadata for custom properties
- Created/updated timestamps

**Business Rules**:
- A customer can have MULTIPLE active subscriptions
- Each subscription links exactly one customer to exactly one plan
- Subscriptions track the complete lifecycle (activation, trial, cancellation, expiration)
- Feature values are resolved as: Subscription Overrides > Plan Values > Feature Defaults
- Only one subscription between a customer and plan can be active at once (prevent duplicates)
- Temporary overrides are cleared during renewal processing
- Permanent overrides persist even after renewal
- When subscription expires, customer loses access to plan features (unless another active subscription)

### 7. Billing Cycles

**Purpose**: Define billing periods and subscription renewal behavior for each plan.

**Requirements**:
- **Plan ID** (FK to plans table) - Each billing cycle belongs to a specific plan
- Unique cycle identifier (key/name) - unique per plan, not globally
- Display name and description
- Duration value (number)
- Duration unit (`days`, `months`, `years`)
- External product ID (for Stripe price mapping)
- Metadata for custom properties

**Business Rules**:
- Billing cycles are plan-specific (each plan defines its own cycles)
- Unique constraint: (plan_id, key)
- Subscriptions reference a billing cycle when created
- Cycle determines subscription period length
- External product ID stores Stripe price ID for billing integration

### 8. Stripe Integration

**Purpose**: Connect plans, billing cycles, and subscriptions to Stripe billing.

**Requirements**:
- Associate plans with Stripe price IDs (each plan-cycle combination can have a price)
- Associate customers with Stripe customer IDs
- Store Stripe subscription IDs on subscriptions
- **API methods to process Stripe events** (implementor receives webhooks and passes event data to library)
- Methods to sync subscription state from Stripe events
- Support for processing Stripe subscription objects
- Handle billing events: subscription.created, subscription.updated, subscription.deleted, invoice.payment_succeeded, invoice.payment_failed

**API Capabilities**:
- Process Stripe event data passed by implementor
- Update subscription lifecycle state based on Stripe events
- Sync subscription periods from Stripe
- Map Stripe price IDs to plan/cycle combinations
- Handle subscription cancellation from Stripe
- Process trial period tracking

**Business Rules**:
- Stripe integration is optional (library works without Stripe)
- External billing ID stored on Customer entity (can be Stripe customer ID or other billing provider)
- Stripe subscription ID stored on Subscription entity
- Stripe price IDs stored at plan-cycle combination level
- **Implementor is responsible for receiving webhooks and verifying signatures**
- Library provides methods to process already-verified Stripe event objects
- Idempotent event processing (handle duplicate events)

## Feature Value Resolution

**Hierarchy**: Feature values are resolved using a hierarchical lookup:

1. **Check Subscription Overrides** - Does the subscription have an override for this feature?
2. **Check Plan Values** - Does the plan specify a value for this feature?
3. **Use Feature Default** - Use the feature's global default value

**Example**:
- Feature "MaxProjects" (global feature) has default: "10"
- Feature associated with "project-management" product
- Plan "Professional" in "project-management" sets MaxProjects: "50"
- Subscription for customer "acme-corp" overrides MaxProjects: "100" (permanent)
- Resolution: "100" (from subscription override)
- If no subscription override: "50" (from plan), if no plan value: "10" (from feature default)

## Technical Architecture - DDD Layers

### Monorepo Structure

**Package Manager**: PNPM with workspaces
**Build Tool**: Vite for all packages

```
subscrio/
├── packages/
│   ├── core/              # @subscrio/core
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── api/               # @subscrio/api
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── admin/             # @subscrio/admin
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
├── pnpm-workspace.yaml
├── package.json           # Root package with build scripts
├── tsconfig.base.json     # Shared TypeScript config
└── .env.example
```

**Why This Structure**:
- **Shared builds**: Single `pnpm build` command builds all packages
- **Testing**: All packages can run tests in isolation or together
- **Type safety**: TypeScript references ensure type checking across packages
- **Code sharing**: `@subscrio/core` is imported directly by both `api` and `admin`
- **Fast development**: Vite provides instant HMR for admin UI
- **Atomic versioning**: All packages can be versioned together

**Package Dependencies**: Both `@subscrio/api` and `@subscrio/admin` import `@subscrio/core` directly. They do not depend on each other.

### DDD Layer Responsibilities

**1. Domain Layer** (`packages/core/src/domain/`):
- **Entities**: Product, Feature, Plan, Customer, APIKey, Subscription, BillingCycle (all with UUIDv7 IDs)
- **Value Objects**: Enums for statuses and types
- **Domain Services**: FeatureValueResolver, SubscriptionRenewalService, validation services
- **Responsibility**: Business logic, entity behavior, domain rules (framework-agnostic)

**2. Application Layer** (`packages/core/src/application/`):
- **Services**: 9 management services (Product, Feature, Plan, Customer, APIKey, Subscription, BillingCycle, Stripe, FeatureChecker)
- **DTOs**: Input/output data transfer objects with Zod validation
- **Mappers**: Transform between Domain ⇄ DTO ⇄ Database records
- **Repository Interfaces**: Define persistence contracts (7 interfaces: IProductRepository, IFeatureRepository, etc.)
- **Responsibility**: Orchestrate use cases, coordinate domain operations, define API contracts

**3. Infrastructure Layer** (`packages/core/src/infrastructure/`):
- **Repository Implementations**: Drizzle-based implementations of all repository interfaces
- **Database**: Drizzle ORM schema, migrations, connection management
- **External Integrations**: Stripe SDK adapter
- **Utilities**: UUIDv7 generator, configuration loader
- **Responsibility**: Database access, external API calls, infrastructure concerns

**Critical Rule**: Application layer NEVER directly accesses database - all database operations go through repository interfaces implemented by infrastructure layer.

### Configuration

**All projects use the same configuration structure:**

**Configuration Interface**:
```typescript
interface SubscrioConfig {
  database: {
    connectionString: string;
    ssl?: boolean;
    poolSize?: number;
  };
  adminPassphrase?: string; // Required for admin UI and API key management
  stripe?: {
    secretKey: string; // For making Stripe API calls
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

**Required Environment Variables**:
- `DATABASE_URL` - PostgreSQL connection string (REQUIRED)
- `ADMIN_PASSPHRASE` - Admin authentication (REQUIRED for admin UI, min 8 characters)
- `STRIPE_SECRET_KEY` - Stripe API key (OPTIONAL, only if using Stripe integration)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification (OPTIONAL)
- `LOG_LEVEL` - Logging level: `debug` | `info` | `warn` | `error` (default: `info`)
- `API_PORT` - REST API server port (default: `3001`, only for `@subscrio/api`)

Configuration is validated using Zod schemas and loaded from environment variables at initialization. Each package imports the configuration interface and creates a `Subscrio` instance or API server.

---

## @subscrio/api - REST API Wrapper

**Purpose**: Standalone Express.js server that wraps `@subscrio/core` and exposes REST endpoints.

### Architecture

- Imports and uses `@subscrio/core` library
- Thin wrapper - delegates all business logic to library
- Provides HTTP/REST interface
- Authentication via API keys
- Can be run standalone or embedded in implementor's Express app

### REST Endpoints

**Authentication**: 
- **MANDATORY**: All endpoints require `X-API-Key` header with valid API key
- API key middleware validates against `api_keys` database table
- Returns 401 Unauthorized if:
  - No API key provided
  - Invalid API key
  - Revoked API key
  - Expired API key
- Scopes: `admin` (full CRUD access) or `readonly` (GET only)
- **NO OTHER AUTHENTICATION METHODS** - API keys only

**Public Endpoints** (no authentication):
- GET `/openapi.json` - OpenAPI specification

**Protected Endpoints** (require valid API key):

**Products**: 
- POST/GET/PUT/DELETE `/api/products`
- POST `/api/products/:id/features/:featureId` - Associate feature
- DELETE `/api/products/:id/features/:featureId` - Dissociate feature

**Features**: 
- POST/GET/PUT/DELETE `/api/features` (global features)
- POST `/api/features/:id/archive` - Archive feature
- POST `/api/features/:id/unarchive` - Unarchive feature

**Plans**: 
- POST/GET/PUT/DELETE `/api/plans`
- PUT `/api/plans/:id/features/:featureId` - Set feature value
- DELETE `/api/plans/:id/features/:featureId` - Remove feature value
- PUT `/api/plans/:id/stripe-prices` - Set Stripe price for billing cycle

**Customers**: 
- POST/GET/PUT/DELETE `/api/customers`
- POST `/api/customers/:externalId/suspend` - Suspend customer
- POST `/api/customers/:externalId/activate` - Activate customer

**API Keys**: 
- POST/GET `/api/api-keys` - Create and list API keys (requires admin scope)
- POST `/api/api-keys/:id/revoke` - Revoke key (requires admin scope)

**Subscriptions**: 
- POST/GET/PUT `/api/subscriptions`
- POST `/api/subscriptions/:id/cancel` - Cancel subscription
- GET `/api/subscriptions/:id/features` - Get resolved features
- POST `/api/subscriptions/:id/feature-overrides` - Add override
- DELETE `/api/subscriptions/:id/feature-overrides/:featureId` - Remove override

**Billing Cycles**: 
- POST/GET/PUT/DELETE `/api/billing-cycles`
- POST `/api/billing-cycles/process-renewals` - Process renewals

**Stripe**: 
- POST `/api/stripe/events` - Process Stripe event (implementor verifies signature, passes event)
- POST `/api/stripe/sync-subscription` - Sync from Stripe
- POST `/api/stripe/create-subscription` - Create in Stripe

**Feature Checker**: 
- GET `/api/customers/:externalId/features` - Get all features
- GET `/api/customers/:externalId/features/:featureKey` - Get specific feature
- GET `/api/customers/:externalId/features/:featureKey/enabled` - Check if enabled

### Middleware

- **API Key Authentication** (MANDATORY - applied to all `/api/*` routes)
  - Validates API key from `X-API-Key` header
  - Checks against `api_keys` database table
  - Verifies key is active, not revoked, not expired
  - Returns 401 if validation fails
- Request validation (Zod schemas)
- Error handling
- Logging
- Rate limiting (per API key)

**Stripe Webhook Integration**: Implementor must:
1. Set up webhook endpoint to receive raw webhooks from Stripe
2. Verify webhook signature using Stripe SDK (`stripe.webhooks.constructEvent()`)
3. Forward verified `Stripe.Event` to `POST /api/stripe/events` endpoint
4. Subscrio processes the event and updates subscriptions

> **📘 For webhook implementation examples, see `packages/api/README.md`**

**Deployment**: Can run standalone (`startApiServer()`) or embedded in existing Express app (`createApiRouter()`). See `packages/api/README.md` for usage examples.

---

## @subscrio/admin - Admin Application

**Purpose**: React-based web UI for managing products, features, plans, customers, and subscriptions.

### Architecture

- **Imports `@subscrio/core` directly** - Does NOT call REST API
- **Runs in the same Node process** as the core library
- Calls library methods directly for all operations
- Uses a **singleton Subscrio instance** imported from core
- Admin passphrase authentication
- React Query for async state management

**Why This Approach**:
- No need to expose database credentials to HTTP layer
- No unnecessary REST API endpoints for internal admin use
- Type-safe: Shares TypeScript types directly with core
- Simpler deployment: Single process, no additional services
- Better performance: Direct method calls, no HTTP overhead

### Technology Stack

- React 18.3
- Vite 5
- Wouter (routing)
- Tailwind CSS
- Radix UI components
- shadcn/ui patterns
- Framer Motion (animations)
- Lucide React (icons)
- React Query (TanStack Query)

**UI Requirements**:
- Modern, professional design with Tailwind CSS and Radix UI components
- Responsive layout with sidebar navigation
- Data tables with sorting, filtering, pagination (TanStack Table)
- Forms with validation (React Hook Form + Zod)
- Toast notifications for feedback (Sonner)
- WCAG 2.1 AA accessibility compliance
- Dark mode support

### Pages/Views

- Dashboard - Overview stats, quick actions
- Products - List/CRUD products, associate/dissociate features
- Features - List/CRUD global features (can associate with multiple products)
- Plans - List/CRUD plans, configure feature values from product's features, set Stripe prices
- Customers - List/CRUD customers
- Subscriptions - List/CRUD subscriptions, manage overrides (permanent/temporary)
- Billing Cycles - List/CRUD cycles
- API Keys - List/create/revoke keys (shows plaintext once)
- Settings - Stripe config, system info

### Integration Pattern

- Creates singleton `Subscrio` instance in `lib/subscrio.ts`
- React components import singleton and call methods directly
- Uses React Query (TanStack Query) for async state management and caching
- No HTTP requests - direct library method calls
- Admin passphrase authentication via library methods (session in React state)

> **📘 For implementation details and component examples, see `packages/admin/README.md`**

**Production**:
```bash
npm run build
npm run preview
```

**Environment Variables**:
```
DATABASE_URL=postgresql://...
ADMIN_PASSPHRASE=your-secure-passphrase
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_... # Implementor uses this to verify webhooks before passing to Subscrio
```

---

## Database Schema

### Tables

**All IDs are UUIDv7** generated by the application.

**products**: id (UUIDv7), key (unique), display_name, description, status, metadata, timestamps

**features**: id (UUIDv7), key (globally unique), display_name, description, value_type, default_value, group_name, status, validator, metadata, timestamps

**product_features**: id (UUIDv7), product_id (FK), feature_id (FK), created_at
  - Unique constraint: (product_id, feature_id)

**plans**: id (UUIDv7), product_key (text), key (unique per product), display_name, description, status, on_expire_transition_to_plan_id (FK to plans, nullable), metadata, timestamps

**plan_features**: id (UUIDv7), plan_id (FK, cascade), feature_id (FK), value, timestamps
  - Unique constraint: (plan_id, feature_id)

**customers**: id (UUIDv7), key (text unique, external identifier), display_name, email, external_billing_id (unique), status, metadata, timestamps

**api_keys**: id (UUIDv7), key (text unique, external reference), key_hash (unique), display_name, description, status, scope, expires_at, last_used_at, ip_whitelist, created_by, metadata, timestamps

**subscriptions**: id (UUIDv7), key (text unique, external reference), customer_id (FK), plan_id (FK), billing_cycle_id (FK), status, activation_date, expiration_date, cancellation_date, trial_end_date, current_period_start, current_period_end, auto_renew, stripe_subscription_id (unique), metadata, timestamps

**subscription_feature_overrides**: id (UUIDv7), subscription_id (FK, cascade), feature_id (FK), value, override_type, created_at
  - Unique constraint: (subscription_id, feature_id)

**billing_cycles**: id (UUIDv7), plan_id (FK, cascade), key (text), display_name, description, duration_value, duration_unit, external_product_id (text, for Stripe price), timestamps
  - Unique constraint: (plan_id, key)

**system_config**: id (UUIDv7), config_key (unique), config_value, encrypted, timestamps

### Key Indexes

- Unique: products.key, features.key, product_features(product_id,feature_id), plans(product_key,key), plan_features(plan_id,feature_id), customers.key, customers.external_billing_id, api_keys.key, api_keys.key_hash, subscriptions.key, subscriptions.stripe_subscription_id, subscription_feature_overrides(subscription_id,feature_id), billing_cycles(plan_id,key)
- Foreign keys: product_features.product_id, product_features.feature_id, plan_features.plan_id, plan_features.feature_id, subscriptions.customer_id, subscriptions.plan_id, subscriptions.billing_cycle_id, subscription_feature_overrides.subscription_id, subscription_feature_overrides.feature_id, billing_cycles.plan_id
- Status: products.status, features.status, plans.status, customers.status, api_keys.status, subscriptions.status
- Other: features.group_name, subscriptions.current_period_end

## DTO Transformation Architecture

**Data Flow**: PostgreSQL Records (snake_case) ⇄ Domain Entities (camelCase, rich types) ⇄ DTOs (JSON-safe)

**Mappers** are the ONLY place where transformation logic exists:
- `toDomain(record)`: Database record → Domain Entity
- `toPersistence(entity)`: Domain Entity → Database record
- `toDto(entity)`: Domain Entity → DTO

**Key Principles**:
- DTOs define the public API contract (Zod-validated, ISO date strings, JSON-safe types)
- Domain Entities contain business logic (rich types like Date objects and enums)
- Database Records use PostgreSQL conventions (snake_case, UUIDv7 IDs)
- Mappers ensure type safety and clean separation between layers

> **📘 See the REFERENCE IMPLEMENTATION PATTERN section above for a complete ProductMapper example.**

---

**API Keys**: All endpoints require `X-API-Key` header with valid key
- Scopes: `admin` (full CRUD), `readonly` (GET only)
- Keys hashed in database, plaintext shown once at creation

**Admin UI**: Passphrase authentication via `X-Admin-Passphrase` header
- Passphrase hashed with bcrypt, stored in system_config

**Stripe Events**: Implementor verifies signatures, passes verified events to library

## Installation & Deployment

Subscrio consists of three packages:

1. **`@subscrio/core`** - Core library with all business logic (REQUIRED)
   - Install: `npm install @subscrio/core`
   - Usage: Import directly in your Node.js application
   - > **📘 See `packages/core/README.md` for complete usage guide**

2. **`@subscrio/api`** - REST API server wrapper (OPTIONAL)
   - Install: `npm install @subscrio/api`
   - Usage: Standalone HTTP server exposing REST endpoints
   - > **📘 See `packages/api/README.md` for setup and API documentation**

3. **`@subscrio/admin`** - React admin web application (OPTIONAL)
   - Usage: Visual management interface for products, features, plans, subscriptions
   - > **📘 See `packages/admin/README.md` for setup and deployment guide**

### Deployment Options

**Option A: Direct Library Integration** (Recommended for most apps)
- Import `@subscrio/core` directly in your application
- Call library methods to manage subscriptions
- No separate API server needed
- Lower latency, simpler deployment

**Option B: REST API** (For external integrations)
- Deploy `@subscrio/api` as a separate service
- Consume REST endpoints with API key authentication
- Suitable for third-party integrations, mobile apps
- > **📘 See OpenAPI spec at `/openapi.json`**

**Option C: Admin UI**
- Build and deploy `@subscrio/admin` static files
- Manage all Subscrio entities through visual interface
- Calls `@subscrio/core` directly (no API server required)
- Protected by admin passphrase authentication

## Testing Requirements

### Test Framework and Approach

- **Framework**: Vitest with end-to-end testing against real PostgreSQL databases
- **Philosophy**: Test ALL public API methods exposed by `@subscrio/core`, not internal implementation
- **Coverage**: Minimum 80% code coverage for all public services
- **Isolation**: Each test suite creates a fresh database, runs tests, then drops the database

### Test Scope - Public API Methods

All methods on the following services MUST have E2E tests:

**Core Services**:
- `subscrio.products` - ProductManagementService (10 methods: create, update, delete, archive, activate, get, getByKey, list, associateFeature, dissociateFeature)
- `subscrio.features` - FeatureManagementService (8 methods: create, update, delete, archive, unarchive, get, list, getByProduct)
- `subscrio.plans` - PlanManagementService (14 methods: create, update, delete, archive, activate, get, getByKey, list, getByProduct, setFeatureValue, removeFeatureValue, getPlanWithFeatures, setStripePriceForCycle, removeStripePriceForCycle)
- `subscrio.customers` - CustomerManagementService (8 methods: create, update, delete, suspend, activate, get, getById, list)
- `subscrio.subscriptions` - SubscriptionManagementService (15 methods: create, activate, cancel, renew, expire, suspend, get, list, getCustomerSubscriptions, getActiveSubscriptionForCustomerAndPlan, addFeatureOverride, removeFeatureOverride, getResolvedFeatures, getResolvedFeatureValue, checkFeatureEnabled)
- `subscrio.billingCycles` - BillingCycleManagementService (7 methods: create, update, delete, get, getByKey, list, processRenewals)
- `subscrio.apiKeys` - APIKeyManagementService (5 methods: create, revoke, get, list, validate)

**Critical Feature Resolution Tests**:
- `subscrio.featureChecker` - FeatureChecker service (6 methods: isEnabled, getValue with/without default, getAllFeatures, isEnabledForSubscription, getValueForSubscription)
- Test feature value hierarchy: Subscription Override > Plan Value > Feature Default
- Test multiple active subscriptions for same customer
- Test plan transitions on expiration

**Stripe Integration Tests** (if `STRIPE_SECRET_KEY` configured):
- `subscrio.stripe` - StripeIntegrationService (5 methods: processStripeEvent, syncSubscriptionFromStripe, syncCustomerFromStripe, getStripePriceForPlan, createStripeSubscription)

### Test Infrastructure

- **Database Setup**: Each test file creates a unique PostgreSQL database before tests and drops it after completion
- **Schema Installation**: Uses public `subscrio.installSchema()` method to initialize test database
- **Docker**: Required only for CI/CD, not for local development
- **Local Development**: Install PostgreSQL 15+ locally, set `TEST_DATABASE_URL` environment variable
- **CI/CD**: GitHub Actions workflow uses Docker PostgreSQL service

### Test Organization

```
packages/core/
  tests/
    setup/
      database.ts       # setupTestDatabase(), teardownTestDatabase()
      fixtures.ts       # Test data factories
      vitest-setup.ts   # Global Vitest configuration
    e2e/
      products.test.ts
      features.test.ts
      plans.test.ts
      customers.test.ts
      subscriptions.test.ts
      billing-cycles.test.ts
      api-keys.test.ts
      feature-checker.test.ts  # Critical: hierarchy tests
      stripe-integration.test.ts
  vitest.config.ts
```

> **📘 For detailed testing documentation, test examples, and CI/CD setup, see `packages/core/tests/README.md`**

---

## Security Requirements

1. **API Keys (REST API Authentication)**:
   - **MANDATORY** for ALL `/api/*` endpoints
   - Cryptographically secure (32+ character random string)
   - Hashed storage in `api_keys` table
   - Scope enforcement (`admin` vs `readonly`)
   - Optional expiration dates
   - Optional IP whitelist
   - Middleware validation on every request
   - Plaintext shown only once at creation
   
2. **Admin Passphrase (Admin UI Authentication)**:
   - Separate from API authentication
   - Used by `@subscrio/admin` React app only
   - Bcrypt hashed, stored in `system_config` table
   - NOT used by REST API
   
3. **Authentication Separation**:
   - `@subscrio/api` - Uses API keys ONLY (no passphrase)
   - `@subscrio/admin` - Uses passphrase (separate from API)
   - Admin UI can call API using its own API key
   
4. **Stripe Webhooks**: 
   - Implementor verifies signatures before passing events to Subscrio
   - Library processes already-verified events only
   
5. **Input Validation**: 
   - Zod schemas for all inputs
   - Validation errors return 400 with details
   
6. **SQL Injection Prevention**: 
   - Parameterized queries via Drizzle ORM
   - No raw SQL strings
   
7. **Rate Limiting**: 
   - Applied per API key
   - Prevents abuse
   - Configurable limits
   
8. **HTTPS**: 
   - Required in production
   - API keys transmitted securely

## Success Criteria

**Functional**:
- Products, features, plans, and subscriptions can be managed via API and UI
- Feature resolution correctly evaluates hierarchy (override > plan > default)
- Stripe integration syncs subscription state
- Renewal processing clears temporary overrides
- API keys enforce scope restrictions
- Plan transitions work on subscription expiry

**Technical**:
- Clean DDD architecture with proper layer separation
- Type-safe throughout (TypeScript)
- Database schema installs without errors
- All endpoints properly authenticated
- Admin UI responsive and accessible

**Performance**:
- Feature resolution queries < 100ms
- Admin UI loads < 2s
- API handles 100+ req/s

---

*End of Requirements Document*