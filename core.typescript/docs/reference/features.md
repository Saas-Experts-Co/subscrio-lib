# Feature Management Service Reference

## Service Overview
The Feature Management Service defines the feature flags and configuration values that plans and subscriptions consume. Features are globally scoped—any plan or subscription can reference them once the owning product links the feature. Each feature declares a `valueType` (`toggle`, `numeric`, or `text`) that drives validation for defaults, plan-level overrides, and subscription overrides.

Key points:
- Feature keys are globally unique and immutable.
- Defaults act as the lowest priority in the resolution hierarchy (subscription override → plan value → feature default).
- A feature cannot be deleted while any product, plan value, or subscription override references it.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const features = subscrio.features;
```

## Method Catalog
| Method | Description | Returns |
| --- | --- | --- |
| `createFeature` | Validates and stores a new global feature | `Promise<FeatureDto>` |
| `updateFeature` | Updates mutable fields on an existing feature | `Promise<FeatureDto>` |
| `getFeature` | Retrieves a feature by key | `Promise<FeatureDto \| null>` |
| `listFeatures` | Lists features with filters | `Promise<FeatureDto[]>` |
| `archiveFeature` | Archives a feature | `Promise<void>` |
| `unarchiveFeature` | Restores an archived feature | `Promise<void>` |
| `deleteFeature` | Deletes an archived feature with no references | `Promise<void>` |
| `getFeaturesByProduct` | Lists features attached to a product | `Promise<FeatureDto[]>` |

## Method Reference

### createFeature
**Description**: Creates a new feature and enforces validation rules determined by `valueType`.

**Signature**
```typescript
createFeature(dto: CreateFeatureDto): Promise<FeatureDto>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dto` | `CreateFeatureDto` | Yes | Payload describing the new feature. |

**Input Properties**
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | 1–255 chars, lowercase alphanumeric plus `-`. |
| `displayName` | `string` | Yes | Human-friendly label (1–255 chars). |
| `description` | `string` | No | ≤ 1000 chars. |
| `valueType` | `'toggle' \| 'numeric' \| 'text'` | Yes | Controls default/override validation. |
| `defaultValue` | `string` | Yes | Must match `valueType` (e.g., `'true'`/`'false'` for toggles). |
| `groupName` | `string` | No | Optional grouping label. |
| `validator` | `Record<string, unknown>` | No | Custom metadata consumed by `FeatureValueValidator`. |
| `metadata` | `Record<string, unknown>` | No | JSON-safe metadata. |

**Returns**
`Promise<FeatureDto>` – persisted feature snapshot.

**Return Properties**
| Field | Type | Description |
| --- | --- | --- |
| `key` | `string` | Immutable feature key. |
| `displayName` | `string` | Display label. |
| `description` | `string \| null` | Optional summary. |
| `valueType` | `string` | Stored type (`toggle`, `numeric`, or `text`). |
| `defaultValue` | `string` | Default value string. |
| `groupName` | `string \| null` | Group label if set. |
| `status` | `string` | `active` or `archived`. |
| `validator` | `Record<string, unknown> \| null` | Stored validator metadata. |
| `metadata` | `Record<string, unknown> \| null` | Metadata blob. |
| `createdAt` | `string` | ISO timestamp. |
| `updatedAt` | `string` | ISO timestamp. |

**Expected Results**
- Validates the DTO and default value using `FeatureValueValidator`.
- Rejects duplicate keys.
- Persists the feature with status `active`.

**Potential Errors**
| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid or default mismatches `valueType`. |
| `ConflictError` | Feature key already exists. |

**Example**
```typescript
await features.createFeature({
  key: 'max-projects',
  displayName: 'Max Projects',
  valueType: 'numeric',
  defaultValue: '10'
});
```

### updateFeature
**Description**: Updates mutable fields (display name, description, default, grouping, validator, metadata).

**Signature**
```typescript
updateFeature(key: string, dto: UpdateFeatureDto): Promise<FeatureDto>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key to mutate. |
| `dto` | `UpdateFeatureDto` | Yes | Partial payload of fields to change. |

**Input Properties**
All fields mirror `CreateFeatureDto` but are optional. When both `valueType` and `defaultValue` are supplied they must remain compatible.

**Returns**
Updated `FeatureDto` (same shape as above).

**Expected Results**
- Validates provided fields.
- Loads feature, applies updates, re-validates default when present, and saves.

**Potential Errors**
| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid or default fails validation. |
| `NotFoundError` | Feature key not found. |

**Example**
```typescript
await features.updateFeature('max-projects', { defaultValue: '25' });
```

### getFeature
**Description**: Retrieves a feature by key; returns `null` when not found.

**Signature**
```typescript
getFeature(key: string): Promise<FeatureDto | null>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature identifier. |

**Returns**
`Promise<FeatureDto | null>` – feature snapshot when found.

**Return Properties**
- `FeatureDto` fields described under `createFeature`.
- `null` when the feature is missing.

**Expected Results**
- Queries repository and maps to DTO.

**Potential Errors**
- None (missing features return `null`).

**Example**
```typescript
const feature = await features.getFeature('gantt-charts');
```

### listFeatures
**Description**: Lists features with pagination, filtering, and sorting.

**Signature**
```typescript
listFeatures(filters?: FeatureFilterDto): Promise<FeatureDto[]>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `filters` | `FeatureFilterDto` | No | Optional filters and pagination controls. |

**Input Properties**
| Field | Type | Description |
| --- | --- | --- |
| `status` | `'active' \| 'archived'` | Filter by lifecycle state. |
| `valueType` | `'toggle' \| 'numeric' \| 'text'` | Filter by type. |
| `groupName` | `string` | Restrict to group. |
| `search` | `string` | Text search across key/display name. |
| `limit` | `number` | 1–100 (default 50). |
| `offset` | `number` | ≥ 0 (default 0). |
| `sortBy` | `'displayName' \| 'createdAt'` | Sort column. |
| `sortOrder` | `'asc' \| 'desc'` | Sort direction, default `'asc'`. |

**Returns**
`Promise<FeatureDto[]>`

**Return Properties**
- Array of `FeatureDto` entries.

**Expected Results**
- Validates filters, executes query, maps results to DTOs.

**Potential Errors**
| Error | When |
| --- | --- |
| `ValidationError` | Filters contain invalid values. |

**Example**
```typescript
const toggles = await features.listFeatures({ valueType: 'toggle', status: 'active' });
```

### archiveFeature
**Description**: Marks a feature as archived.

**Signature**
```typescript
archiveFeature(key: string): Promise<void>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key to archive. |

**Returns**
`Promise<void>`

**Expected Results**
- Loads feature, calls the entity’s `archive()` method, and saves.

**Potential Errors**
| Error | When |
| --- | --- |
| `NotFoundError` | Feature key missing. |

**Example**
```typescript
await features.archiveFeature('legacy-beta');
```

### unarchiveFeature
**Description**: Restores an archived feature to `active`.

**Signature**
```typescript
unarchiveFeature(key: string): Promise<void>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key previously archived. |

**Returns**
`Promise<void>`

**Expected Results**
- Loads feature, calls `unarchive()`, and saves.

**Potential Errors**
| Error | When |
| --- | --- |
| `NotFoundError` | Feature key missing. |

**Example**
```typescript
await features.unarchiveFeature('legacy-beta');
```

### deleteFeature
**Description**: Permanently removes a feature that is archived and unused.

**Signature**
```typescript
deleteFeature(key: string): Promise<void>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key targeted for deletion. |

**Returns**
`Promise<void>`

**Expected Results**
- Validates the feature exists and `feature.canDelete()` (must be archived).
- Verifies no product associations, plan feature values, or subscription overrides remain.
- Deletes the feature record.

**Potential Errors**
| Error | When |
| --- | --- |
| `NotFoundError` | Feature missing. |
| `DomainError` | Feature still referenced or not archived. |

**Example**
```typescript
await features.deleteFeature('sunset-flag');
```

### getFeaturesByProduct
**Description**: Lists the features currently linked to a product.

**Signature**
```typescript
getFeaturesByProduct(productKey: string): Promise<FeatureDto[]>
```

**Inputs**
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `productKey` | `string` | Yes | Product key to inspect. |

**Returns**
`Promise<FeatureDto[]>`

**Expected Results**
- Ensures the product exists.
- Queries repository for all features associated with the product.

**Potential Errors**
| Error | When |
| --- | --- |
| `NotFoundError` | Product missing. |

**Example**
```typescript
const featureList = await features.getFeaturesByProduct('pro-suite');
```

## Related Workflows
- Products must associate features before plans can set values (`ProductManagementService.associateFeature`).
- Plan-level values are defined via `PlanManagementService.setFeatureValue` and take precedence over defaults.
- Subscription overrides from `SubscriptionManagementService.addFeatureOverride` have the highest priority during feature resolution.
### getFeaturesByProduct

**Description**: Lists features currently associated with a product.

**Signature**

```typescript
getFeaturesByProduct(productKey: string): Promise<FeatureDto[]>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `productKey` | `string` | Yes | Product key to inspect. |

**Input Properties**

- None beyond the key string.

**Returns**

`Promise<FeatureDto[]>`

**Return Properties**

- [`FeatureDto`](#featuredto)[] – DTOs linked to the specified product.

**Expected Results**

- Ensures product exists.
- Queries repository via product ID and maps results.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Product missing. |

**Example**

```typescript
const featureList = await features.getFeaturesByProduct('pro-suite');
```
### deleteFeature

**Description**: Permanently deletes a feature after ensuring no active relationships.

**Signature**

```typescript
deleteFeature(key: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key targeted for deletion. |

**Input Properties**

- None beyond the key string.

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Requires feature to exist and be archived (`feature.canDelete()`).
- Verifies there are no product associations, plan feature values, or subscription overrides.
- Removes the feature record.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Feature missing. |
| `DomainError` | Feature not archived or still in use. |

**Example**

```typescript
await features.deleteFeature('sunset-flag');
```
### listFeatures

**Description**: Lists features with pagination/filters.

**Signature**

```typescript
listFeatures(filters?: FeatureFilterDto): Promise<FeatureDto[]>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `filters` | [`FeatureFilterDto`](#featurefilterdto) | No | Status, value type, group, search, pagination, sorting. |

**Input Properties**

- [`FeatureFilterDto`](#featurefilterdto) – limits status, value type, search, and pagination options.

**Returns**

`Promise<FeatureDto[]>`

**Return Properties**

- [`FeatureDto`](#featuredto)[] – DTOs for each feature returned.

**Expected Results**

- Validates filters, queries repository, maps to DTOs.

**Potential Errors**

| Error | When |
| --- | --- |
| `ValidationError` | Filters contain invalid values. |

**Example**

```typescript
await features.listFeatures({ valueType: 'toggle', status: 'active' });
```
# Feature Management Service Reference

## Service Overview
The Feature Management Service defines feature flags/values that plans and subscriptions consume. Features are global (shared across products) and enforce value-type validation rules.

- Keys are globally unique and immutable.
- Each feature declares a `valueType` (`toggle`, `numeric`, `text`) that constrains defaults and overrides.
- Features cannot be deleted while still linked to products, plans, or subscription overrides.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const features = subscrio.features;
```

## Method Catalog
| Method | Description | Returns |
| --- | --- | --- |
| `createFeature` | Validates and stores a new global feature | `Promise<FeatureDto>` |
| `updateFeature` | Updates mutable fields on an existing feature | `Promise<FeatureDto>` |
| `getFeature` | Retrieves a feature by key | `Promise<FeatureDto \| null>` |
| `listFeatures` | Lists features with filters | `Promise<FeatureDto[]>` |
| `archiveFeature` | Archives a feature | `Promise<void>` |
| `unarchiveFeature` | Restores an archived feature | `Promise<void>` |
| `deleteFeature` | Permanently deletes a feature with no associations | `Promise<void>` |
| `getFeaturesByProduct` | Lists features connected to a product | `Promise<FeatureDto[]>` |

## Method Reference

### createFeature

**Description**: Creates a new feature and enforces default value constraints based on `valueType`.

**Signature**

```typescript
createFeature(dto: CreateFeatureDto): Promise<FeatureDto>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dto` | [`CreateFeatureDto`](#createfeaturedto) | Yes | Includes key, displayName, description, `valueType`, `defaultValue`, optional grouping, validator, metadata. |

**Input Properties**

- [`CreateFeatureDto`](#createfeaturedto) – defines required fields plus optional metadata and validation descriptors.

**Returns**

Persisted [`FeatureDto`](#featuredto).

**Return Properties**

- [`FeatureDto`](#featuredto) – serialized feature with timestamps and status.

**Expected Results**

- Validates DTO.
- Rejects duplicate keys.
- Calls `FeatureValueValidator.validate` for the default value.
- Persists a new feature with status `active`.

**Potential Errors**

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid or default value incompatible with type. |
| `ConflictError` | Key already exists. |

**Example**

```typescript
await features.createFeature({
  key: 'max-projects',
  displayName: 'Max Projects',
  valueType: 'numeric',
  defaultValue: '10'
});
```

### updateFeature

**Description**: Updates mutable fields and optionally sets a new default value (validated again).

**Signature**

```typescript
updateFeature(key: string, dto: UpdateFeatureDto): Promise<FeatureDto>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Immutable feature key. |
| `dto` | [`UpdateFeatureDto`](#updatefeaturedto) | Yes | Partial update object. |

**Input Properties**

- [`UpdateFeatureDto`](#updatefeaturedto) – optional fields mirroring create with relaxed requirements.

**Returns**

Updated [`FeatureDto`](#featuredto).

**Return Properties**

- [`FeatureDto`](#featuredto) – reflects all persisted changes.

**Expected Results**

- Validates DTO.
- Loads feature; updates display name, description, default value, group, validator, metadata.
- Re-validates default when provided.

**Potential Errors**

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid or default fails validation. |
| `NotFoundError` | Feature missing. |

**Example**

```typescript
await features.updateFeature('max-projects', { defaultValue: '25' });
```

### getFeature

**Description**: Fetches a feature by key or returns `null`.

**Signature**

```typescript
getFeature(key: string): Promise<FeatureDto | null>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key. |

**Input Properties**

- None beyond the key string.

**Returns**

`Promise<FeatureDto | null>` – resolves with [`FeatureDto`](#featuredto) when found; `null` otherwise.

**Return Properties**

- [`FeatureDto`](#featuredto) – populated when key exists.
- `null` – indicates missing feature.

**Expected Results**

- Queries repository and maps to DTO.

**Potential Errors**

- None.

**Example**

```typescript
const feature = await features.getFeature('gantt-charts');
```


### archiveFeature

**Description**: Sets a feature’s status to `archived`.

**Signature**

```typescript
archiveFeature(key: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key to archive. |

**Input Properties**

- None beyond the key string.

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Loads feature, calls the entity’s `archive()` method, and saves.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Feature key missing. |

**Example**

```typescript
await features.archiveFeature('legacy-beta');
```

### unarchiveFeature

**Description**: Restores an archived feature to `active`.

**Signature**

```typescript
unarchiveFeature(key: string): Promise<void>
```

**Inputs**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Feature key previously archived. |

**Input Properties**

- None.

**Returns**

`Promise<void>`

**Return Properties**

- `void`

**Expected Results**

- Loads feature, calls `unarchive()`, and saves.

**Potential Errors**

| Error | When |
| --- | --- |
| `NotFoundError` | Feature key missing. |

**Example**

```typescript
await features.unarchiveFeature('legacy-beta');
```



## DTO Reference

### CreateFeatureDto
| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `key` | `string` | Yes | 1–255 chars, alphanumeric with `-`/`_`. |
| `displayName` | `string` | Yes | 1–255 chars. |
| `description` | `string` | No | ≤ 1000 chars. |
| `valueType` | `'toggle' \| 'numeric' \| 'text'` | Yes | Drives validation rules. |
| `defaultValue` | `string` | Yes | Toggle: `'true'`/`'false'`; Numeric: valid number; Text: any non-empty string. |
| `groupName` | `string` | No | ≤ 255 chars. |
| `validator` | `Record<string, unknown>` | No | Custom validation metadata. |
| `metadata` | `Record<string, unknown>` | No | Free-form metadata. |

### UpdateFeatureDto
Same fields as create but all optional; when both `valueType` and `defaultValue` are provided they must still agree.

### FeatureDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Immutable. |
| `displayName` | `string` | Yes | |
| `description` | `string \| null` | No | |
| `valueType` | `string` | Yes | `'toggle'`, `'numeric'`, or `'text'`. |
| `defaultValue` | `string` | Yes | Stored as string; interpret based on type. |
| `groupName` | `string \| null` | No | |
| `status` | `string` | Yes | `'active'` or `'archived'`. |
| `validator` | `Record<string, unknown> \| null` | No | |
| `metadata` | `Record<string, unknown> \| null` | No | |
| `createdAt` | `string` | Yes | ISO timestamp. |
| `updatedAt` | `string` | Yes | ISO timestamp. |

### FeatureFilterDto
| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `status` | `'active' \| 'archived'` | No | |
| `valueType` | `'toggle' \| 'numeric' \| 'text'` | No | |
| `groupName` | `string` | No | |
| `search` | `string` | No | |
| `sortBy` | `'displayName' \| 'createdAt'` | No | |
| `sortOrder` | `'asc' \| 'desc'` | No | |
| `limit` | `number` | No | 1–100, default 50. |
| `offset` | `number` | No | ≥0, default 0. |

## Related Workflows
- Products must explicitly associate features before plans can set values (`ProductManagementService.associateFeature`).
- Feature defaults are used as the final fallback in the feature resolution hierarchy (`FeatureCheckerService`).
- Deleting a feature requires removing plan values and subscription overrides that reference it.

