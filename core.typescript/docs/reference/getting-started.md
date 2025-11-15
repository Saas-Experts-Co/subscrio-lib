# Subscrio Core API Reference

Complete documentation of all data structures and methods exposed by `@subscrio/core`.

## Main Class

### Subscrio

```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL
  }
});
```

### Constructor

#### Description
 Instantiates the core library, initializes the database connection, and wires every repository and service so callers can use Subscrio synchronously after construction.

#### Signature

```typescript
new Subscrio(config: SubscrioConfig)
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `config` | [`SubscrioConfig`](#configuration-object) | Yes | Database connection plus optional passphrase, Stripe, and logging overrides. |

#### Input Properties

- [`SubscrioConfig`](#configuration-object) – high-level shape that includes the `database`, `stripe`, and `logging` objects defined later in this page.

#### Returns

Creates a new `Subscrio` instance that exposes the services listed in the “Public Services” table above.

#### Return Properties

- `Subscrio` – instance with properties such as `products`, `plans`, `featureChecker`, etc.

#### Expected Results

- Initializes a Postgres database connection using `config.database`.
- Constructs repository instances and wires each service with its dependencies.
- Keeps a shared schema installer for schema management helpers.

#### Potential Errors

| Error | When |
| --- | --- |
| `ConfigurationError` | Thrown downstream if `config` is invalid or a database connection cannot be established. |

#### Example

```typescript
const subscrio = new Subscrio({
  database: { connectionString: process.env.DATABASE_URL! },
  adminPassphrase: process.env.ADMIN_PASSPHRASE
});
```

#### Configuration object

`Subscrio` consumes a strongly typed `SubscrioConfig` (defined in `src/config/types.ts`). The `database` object shown below is the real constructor contract—`connectionString` sits under `database` because the initializer expects a cohesive pg config object.

```typescript
export interface SubscrioConfig {
  database: {
    connectionString: string;
    ssl?: boolean;
    poolSize?: number;
  };
  adminPassphrase?: string;
  stripe?: {
    secretKey: string;
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

Only `database.connectionString` is required; every other field is optional and can be omitted if you do not need that capability.

##### `database` object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `connectionString` | `string` | Yes | Full Postgres URI (`postgresql://user:pass@host:port/db`). |
| `ssl` | `boolean` | No | Forces SSL when running outside trusted networks. |
| `poolSize` | `number` | No | Custom pg pool size; defaults to driver preset. |

##### `adminPassphrase`

Optional override for the admin passphrase hash stored during `installSchema()`. If omitted you can pass the passphrase directly to `installSchema`.

##### `stripe` object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `secretKey` | `string` | Yes | Server-side Stripe secret used by helpers like `createStripeSubscription`. |

##### `logging` object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | `'debug' \| 'info' \| 'warn' \| 'error'` | Yes | Sets global log verbosity for Subscrio internals. |

### installSchema

#### Description
 Creates every Subscrio database table, seeds configuration rows, and optionally writes the admin passphrase hash when setting up a fresh environment.

#### Signature

```typescript
installSchema(adminPassphrase?: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `adminPassphrase` | `string` | No | Optional override that supersedes `config.adminPassphrase`. |

#### Input Properties

- `adminPassphrase` – plain text string that will be hashed before being stored in `system_config`.

#### Returns

Resolves with `void` once the schema is fully installed.

#### Return Properties

- `void`

#### Expected Results

- Runs the schema installer to create all tables, extensions, and seed configuration rows.
- Stores the admin passphrase hash when provided.

#### Potential Errors

| Error | When |
| --- | --- |
| `ConfigurationError` | Database connection unavailable or migration prerequisites missing. |
| `DomainError` | Passphrase validation fails the policy enforced by the installer. |

#### Example

```typescript
await subscrio.installSchema('super-secret-passphrase');
```

### verifySchema

#### Description
 Confirms whether the Subscrio schema is already installed so callers can decide to run `installSchema()` or proceed with normal operations.

#### Signature

```typescript
verifySchema(): Promise<boolean>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| _None_ |  |  |  |

#### Input Properties

- None.

#### Returns

`Promise<boolean>` that resolves to `true` when every required table/index exists; `false` otherwise.

#### Return Properties

- `boolean` – indicates whether the schema is ready for use.

#### Expected Results

- Executes lightweight checks on required tables and indexes via the schema installer.

#### Potential Errors

| Error | When |
| --- | --- |
| `ConfigurationError` | Database connection is unavailable. |

#### Example

```typescript
const ready = await subscrio.verifySchema();
if (!ready) {
  console.warn('Subscrio schema missing – run installSchema() first.');
}
```

### dropSchema

#### Description
 Removes every table created by Subscrio. Intended for local development resets or automated tests.

#### Signature

```typescript
dropSchema(): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| _None_ |  |  |  |

#### Input Properties

- None.

#### Returns

Resolves with `void` after the installer drops all managed tables.

#### Return Properties

- `void`

#### Expected Results

- Drops every Subscrio-owned table via the installer. This is destructive and meant for local resets/tests.

#### Potential Errors

| Error | When |
| --- | --- |
| `ConfigurationError` | Database refuses the drop (permissions, locks). |

#### Example

```typescript
if (process.env.NODE_ENV === 'test') {
  await subscrio.dropSchema();
}
```

### close

#### Description
 Closes the shared Drizzle/pg connection pool so Node processes can exit cleanly.

#### Signature

```typescript
close(): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| _None_ |  |  |  |

#### Input Properties

- None.

#### Returns

Resolves with `void` after all connections are closed.

#### Return Properties

- `void`

#### Expected Results

- Closes pg pool connections and disposes of Drizzle resources.

#### Potential Errors

| Error | When |
| --- | --- |
| `ConfigurationError` | Database connection has already been torn down unexpectedly. |

#### Example

```typescript
await subscrio.close();
```

---

## Service Reference Index

All service-level documentation now lives in dedicated markdown files so each method, DTO, error, and example can be described in depth. The following table shows where to find those references:

| Service | Scope | Reference |
| --- | --- | --- |
| ProductManagementService | Product CRUD, feature associations | [`products.md`](./products.md) |
| FeatureManagementService | Global feature definitions | [`features.md`](./features.md) |
| PlanManagementService | Plans, feature values, transitions | [`plans.md`](./plans.md) |
| BillingCycleManagementService | Billing cadence + price mappings | [`billing-cycles.md`](./billing-cycles.md) |
| CustomerManagementService | Customer lifecycle | [`customers.md`](./customers.md) |
| SubscriptionManagementService | Subscriptions, overrides, batch jobs | [`subscriptions.md`](./subscriptions.md) |
| FeatureCheckerService | Runtime feature resolution APIs | [`feature-checker.md`](./feature-checker.md) |
| StripeIntegrationService | Stripe webhook processing & helpers | [`stripe-integration.md`](./stripe-integration.md) |

> Every service doc follows the [Service Reference Template](./SERVICE_DOC_TEMPLATE.md), which standardizes sections for usage, inputs/outputs, DTOs, expected results, errors, and working examples.

## Additional Reference Guides

- `subscriptions.md` covers CRUD APIs, DTOs, overrides, and lifecycle automation APIs.
- `subscription-lifecycle.md` fully documents how each status is calculated (with diagrams) and how transitions work.
- `relationships.md` centralizes the product/plan/feature/billing-cycle/customer relationships, the feature resolution hierarchy, and the customer key conventions.
- `products.md`, `plans.md`, `features.md`, and `billing-cycles.md` document CRUD flows, DTOs, and association helpers for each domain surface.
- `feature-checker.md` explains the subscription override → plan value → feature default resolution order in depth.
- `customers.md` details how caller-supplied customer keys map to internal IDs and where they are required.
- `stripe-integration.md` contains the full Stripe workflow, including where signature verification must happen before calling `processStripeEvent()`.
