### setFeatureValue

**Description**: Sets a plan-level override for a feature.

**Signature**

```typescript
setFeatureValue(planKey: string, featureKey: string, value: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Target plan. |
| `featureKey` | `string` | Yes | Feature to set. |
| `value` | `string` | Yes | Stored string value validated against feature type. |

**Input Properties**

- `value` – must satisfy the feature’s `valueType` and validation settings (see [`FeatureDto`](./features.md#featuredto)).

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Confirms plan and feature exist.
- Validates `value` via `FeatureValueValidator`.
- Adds or updates feature value on the plan and saves.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Plan or feature missing. |
| `ValidationError` | Value fails validator. |

**Example**

```typescript
await plans.setFeatureValue('annual-pro', 'max-projects', '100');
```
### updatePlan

**Description**: Updates description, display name, transition target, or metadata.

**Signature**

```typescript
updatePlan(planKey: string, dto: UpdatePlanDto): Promise<PlanDto>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Plan to mutate. |
| `dto` | [`UpdatePlanDto`](#updateplandto) | Yes | Partial update. |

**Input Properties**

- [`UpdatePlanDto`](#updateplandto) – optional fields mirroring `CreatePlanDto`.

**Returns**

Updated [`PlanDto`](#plandto).

**Return Properties**

- [`PlanDto`](#plandto) – plan snapshot after saving.

**Expected Results**

- Validates DTO.
- Loads plan, mutates allowed properties, persists.

**Potential Errors**

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid. |
| `NotFoundError` | Plan missing. |

**Example**

```typescript
await plans.updatePlan('annual-pro', {
  onExpireTransitionToBillingCycleKey: 'monthly-pro'
});
```
### createPlan

**Description**: Validates DTO, ensures product exists, and writes a new plan.

**Signature**

```typescript
createPlan(dto: CreatePlanDto): Promise<PlanDto>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dto` | [`CreatePlanDto`](#createplandto) | Yes | Contains productKey, plan key, display name, description, optional transition billing cycle key, metadata. |

**Input Properties**

- [`CreatePlanDto`](#createplandto) – full list of plan creation fields, constraints, and defaults.

**Returns**

Persisted [`PlanDto`](#plandto) with `status: 'active'`.

**Return Properties**

- [`PlanDto`](#plandto) – serialized plan including feature values.

**Expected Results**

- Validates DTO.
- Finds the product by key.
- Fails if the plan key already exists.
- Persists plan with default `featureValues` array.

**Potential Errors**

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid. |
| `NotFoundError` | Product missing. |
| `ConflictError` | Plan key already taken. |

**Example**

```typescript
await plans.createPlan({
  productKey: 'pro-suite',
  key: 'annual-pro',
  displayName: 'Annual Pro',
  metadata: { priceUsd: 499 }
});
```
# Plan Management Service Reference

## Service Overview
Plans represent purchasable tiers within a product. This service handles plan CRUD, feature values, and deletion constraints driven by billing cycles and subscriptions.

- Plan keys are globally unique and immutable.
- Plans belong to a single product (via `productKey` stored on the plan entity).
- Plans may configure automatic transitions via `onExpireTransitionToBillingCycleKey`.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const plans = subscrio.plans;
```

## Method Catalog
| Method | Description | Returns |
| --- | --- | --- |
| `createPlan` | Creates a plan tied to an existing product | `Promise<[PlanDto](#plandto)>` |
| `updatePlan` | Updates mutable plan fields | `Promise<[PlanDto](#plandto)>` |
| `getPlan` | Retrieves a plan by key | `Promise<[PlanDto](#plandto) \| null>` |
| `listPlans` | Lists plans with filters | `Promise<[PlanDto](#plandto)[]>` |
| `getPlansByProduct` | Lists plans for a product | `Promise<[PlanDto](#plandto)[]>` |
| `archivePlan` | Archives a plan | `Promise<void>` |
| `unarchivePlan` | Reactivates a plan | `Promise<void>` |
| `deletePlan` | Deletes an archived plan that has no billing cycles or subscriptions | `Promise<void>` |
| `setFeatureValue` | Sets a plan-specific feature value | `Promise<void>` |
| `removeFeatureValue` | Removes a feature value override | `Promise<void>` |
| `getFeatureValue` | Reads a plan’s value for a feature | `Promise<string \| null>` |
| `getPlanFeatures` | Lists all feature values defined on a plan | `Promise<Array<{ featureKey: string; value: string }>>` |

## Method Reference



### getPlan

**Description**: Retrieves a plan by key or returns `null`.

**Signature**

```typescript
getPlan(planKey: string): Promise<PlanDto | null>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Plan key to fetch. |

**Input Properties**

- None beyond the key.

**Returns**

`Promise<PlanDto | null>`

**Return Properties**

- [`PlanDto`](#plandto) – when plan exists.
- `null` – when missing.

**Expected Results**

- Loads plan from repository and maps to DTO.

**Potential Errors**

- None.

**Example**

```typescript
const plan = await plans.getPlan('annual-pro');
```

### listPlans

**Description**: Lists plans with filters.

**Signature**

```typescript
listPlans(filters?: PlanFilterDto): Promise<PlanDto[]>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `filters` | [`PlanFilterDto`](#planfilterdto) | No | Status, product key, pagination, etc. |

**Input Properties**

- [`PlanFilterDto`](#planfilterdto) – governs filtering and pagination.

**Returns**

`Promise<PlanDto[]>`

**Return Properties**

- [`PlanDto`](#plandto)[] – DTO list satisfying filters.

**Expected Results**

- Validates filters and queries repository.

**Potential Errors**

| Error | When |
| --- | --- |
| `ValidationError` | Filters invalid. |

**Example**

```typescript
const archivedPlans = await plans.listPlans({ status: 'archived' });
```

### getPlansByProduct

**Description**: Lists plans belonging to a product.

**Signature**

```typescript
getPlansByProduct(productKey: string): Promise<PlanDto[]>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `productKey` | `string` | Yes | Product owning the plans. |

**Input Properties**

- None beyond the key string.

**Returns**

`Promise<PlanDto[]>`

**Return Properties**

- [`PlanDto`](#plandto)[] – each plan tied to the product.

**Expected Results**

- Ensures product exists, then queries repository for plans.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Product missing. |

**Example**

```typescript
const proPlans = await plans.getPlansByProduct('pro-suite');
```

### archivePlan

**Description**: Sets a plan’s status to `archived`.

**Signature**

```typescript
archivePlan(planKey: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Plan key to archive. |

**Input Properties**

- None beyond the key.

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Loads plan, calls `archive()`, persists.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Plan missing. |

### unarchivePlan

**Description**: Reactivates a plan.

**Signature**

```typescript
unarchivePlan(planKey: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Archived plan key. |

**Input Properties**

- None.

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Loads plan, calls `unarchive()`, saves.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Plan missing. |

### deletePlan

**Description**: Deletes a plan only when it is archived and unused.

**Signature**

```typescript
deletePlan(planKey: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Plan to delete. |

**Input Properties**

- None beyond the key.

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Verifies plan exists and `plan.canDelete()`.
- Ensures there are no subscriptions for the plan.
- Ensures there are no billing cycles referencing the plan.
- Deletes record.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Plan missing. |
| `DomainError` | Plan is active, has subscriptions, or has billing cycles. |


### removeFeatureValue

**Description**: Removes an existing plan feature override.

**Signature**

```typescript
removeFeatureValue(planKey: string, featureKey: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Plan losing the override. |
| `featureKey` | `string` | Yes | Feature key to remove. |

**Input Properties**

- None beyond the keys.

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Ensures plan and feature exist, then removes stored value if present.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Plan or feature missing. |

### getFeatureValue

**Description**: Returns a plan’s value for a feature (or `null` if unset).

**Signature**

```typescript
getFeatureValue(planKey: string, featureKey: string): Promise<string | null>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Plan to inspect. |
| `featureKey` | `string` | Yes | Feature key. |

**Input Properties**

- None beyond the keys.

**Returns**

`Promise<string | null>`

**Return Properties**

- `string` – stored value (string representation) when present.
- `null` – when value is absent.

**Expected Results**

- Loads plan and returns the stored feature value if present.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Plan missing. |

### getPlanFeatures

**Description**: Lists every feature value pair defined on the plan.

**Signature**

```typescript
getPlanFeatures(planKey: string): Promise<Array<{ featureKey: string; value: string }>>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `planKey` | `string` | Yes | Plan to inspect. |

**Input Properties**

- None beyond the key.

**Returns**

`Promise<Array<{ featureKey: string; value: string }>>`

**Return Properties**

- Array of objects with `featureKey` and string `value`.

**Expected Results**

- Loads plan, iterates feature values, enriches with feature keys, returns array.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Plan missing. |

## DTO Reference

### CreatePlanDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `productKey` | `string` | Yes | Lowercase alphanumeric-with-hyphen. |
| `key` | `string` | Yes | Unique plan identifier. |
| `displayName` | `string` | Yes | 1–255 chars. |
| `description` | `string` | No | ≤ 1000 chars. |
| `onExpireTransitionToBillingCycleKey` | `string` | No | Key of billing cycle to transition to automatically. |
| `metadata` | `Record<string, unknown>` | No | Extra data. |

### UpdatePlanDto
All fields optional: `displayName`, `description`, `onExpireTransitionToBillingCycleKey`, `metadata`.

### PlanDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `productKey` | `string` | Yes | Parent product key. |
| `key` | `string` | Yes | Plan key. |
| `displayName` | `string` | Yes | |
| `description` | `string \| null` | No | |
| `status` | `string` | Yes | `'active'` or `'archived'`. |
| `onExpireTransitionToBillingCycleKey` | `string \| null` | No | |
| `metadata` | `Record<string, unknown> \| null` | No | |
| `createdAt` | `string` | Yes | ISO timestamp. |
| `updatedAt` | `string` | Yes | ISO timestamp. |

### PlanFilterDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `productKey` | `string` | No | Filter by product. |
| `status` | `'active' \| 'archived'` | No | |
| `search` | `string` | No | |
| `sortBy` | `'displayName' \| 'createdAt'` | No | |
| `sortOrder` | `'asc' \| 'desc'` | No | |
| `limit` | `number` | No | 1–100, default 50. |
| `offset` | `number` | No | ≥0, default 0. |

## Related Workflows
- Plans require the product to exist first (`ProductManagementService`).
- A plan cannot be deleted while billing cycles (`BillingCycleManagementService`) or subscriptions (`SubscriptionManagementService`) reference it.
- Plan feature values feed into the feature resolution order used by `FeatureCheckerService`.

