# Subscription Management Service Reference

## Service Overview
Subscriptions tie customers to plans and billing cycles, track lifecycle dates, and store feature overrides. This service manages creation, updates, status synchronization, feature overrides, and batch maintenance tasks.

- Subscription keys are caller-supplied and immutable.
- Billing cycles derive plan/product context; updating a subscription’s billing cycle also changes its plan.
- Status is computed dynamically via the `subscription_status_view` database view, so status filters always reflect real time.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const subscriptions = subscrio.subscriptions;
```

## Method Catalog

| Method | Description | Returns |
| --- | --- | --- |
| `createSubscription` | Creates a subscription for a customer and billing cycle | `Promise<SubscriptionDto>` |
| `updateSubscription` | Updates lifecycle fields, metadata, or billing cycle | `Promise<SubscriptionDto>` |
| `getSubscription` | Retrieves a subscription by key | `Promise<SubscriptionDto | null>` |
| `listSubscriptions` | Lists subscriptions via simple filters | `Promise<SubscriptionDto[]>` |
| `findSubscriptions` | Advanced filtering (date ranges, overrides, metadata) | `Promise<SubscriptionDto[]>` |
| `getSubscriptionsByCustomer` | Lists subscriptions for a customer | `Promise<SubscriptionDto[]>` |
| `archiveSubscription` | Flags a subscription as archived | `Promise<void>` |
| `unarchiveSubscription` | Clears archived flag | `Promise<void>` |
| `deleteSubscription` | Deletes a subscription | `Promise<void>` |
| `addFeatureOverride` | Adds or updates a feature override | `Promise<void>` |
| `removeFeatureOverride` | Removes a feature override | `Promise<void>` |
| `clearTemporaryOverrides` | Removes temporary overrides | `Promise<void>` |

## Method Reference

### createSubscription

#### Description
Creates a subscription linking a customer to a plan/billing cycle and initializes lifecycle dates and metadata.

#### Signature
```typescript
createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionDto>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dto` | `CreateSubscriptionDto` | Yes | Subscription definition including customer/billing cycle keys. |

#### Input Properties

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription identifier (1–255 chars). |
| `customerKey` | `string` | Yes | Existing customer key. |
| `billingCycleKey` | `string` | Yes | Existing billing cycle key (derives plan/product). |
| `activationDate` | `string | Date` | No | Defaults to current time. |
| `expirationDate` | `string | Date` | No | Optional termination date. |
| `cancellationDate` | `string | Date` | No | Optional cancellation timestamp. |
| `trialEndDate` | `string | Date` | No | Controls `trial` status. |
| `currentPeriodStart` | `string | Date` | No | Defaults to now. |
| `currentPeriodEnd` | `string | Date` | No | Calculated from billing cycle if omitted. |
| `stripeSubscriptionId` | `string` | No | Optional Stripe linkage (must be unique). |
| `metadata` | `Record<string, unknown>` | No | JSON-safe metadata. |

#### Returns
`Promise<SubscriptionDto>` – persisted subscription snapshot with derived customer/product/plan keys.

#### Expected Results
- Validates DTO and lifecycle dates.
- Ensures customer and billing cycle exist (deriving plan/product).
- Confirms subscription key and Stripe subscription ID are unique.
- Backfills `currentPeriodEnd` when omitted.
- Persists subscription; status is later read from the PostgreSQL view.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid or lifecycle math fails. |
| `NotFoundError` | Customer, billing cycle, plan, or product missing. |
| `ConflictError` | Duplicate subscription key or Stripe ID. |

#### Example
```typescript
await subscriptions.createSubscription({
  key: 'sub_1001',
  customerKey: 'cust_123',
  billingCycleKey: 'annual-pro-12m',
  activationDate: new Date().toISOString(),
  metadata: { source: 'self-serve' }
});
```

### updateSubscription

#### Description
Applies partial updates to lifecycle dates, billing cycle, Stripe linkage, or metadata.

#### Signature
```typescript
updateSubscription(key: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDto>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription key to update. |
| `dto` | `UpdateSubscriptionDto` | Yes | Partial payload of mutable fields. |

#### Input Properties

| Field | Type | Description |
| --- | --- | --- |
| `billingCycleKey` | `string` | Moves subscription to a new plan/billing cycle. |
| `expirationDate` | `string | Date` | Updates expiration. |
| `cancellationDate` | `string | Date` | Updates cancellation timestamp. |
| `trialEndDate` | `string | Date | null` | Updates or clears trial end. |
| `currentPeriodStart` | `string | Date` | Adjusts current period. |
| `currentPeriodEnd` | `string | Date` | Overrides calculated end. |
| `stripeSubscriptionId` | `string | null` | Updates or clears Stripe linkage. |
| `metadata` | `Record<string, unknown>` | Replaces metadata blob. |

#### Returns
`Promise<SubscriptionDto>` – updated subscription snapshot.

#### Expected Results
- Validates DTO and detects explicitly cleared fields.
- Loads subscription; rejects if archived.
- Applies lifecycle and billing cycle changes (updating plan ID when billing cycle changes).
- Persists entity; status continues to be resolved by the database view.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid. |
| `NotFoundError` | Subscription or referenced billing cycle missing. |
| `DomainError` | Subscription archived (must unarchive first). |

#### Example
```typescript
await subscriptions.updateSubscription('sub_1001', {
  billingCycleKey: 'monthly-pro',
  currentPeriodEnd: new Date().toISOString()
});
```

### getSubscription

#### Description
Retrieves a subscription by key, returning `null` when it does not exist.

#### Signature
```typescript
getSubscription(key: string): Promise<SubscriptionDto | null>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription key to fetch. |

#### Returns
`Promise<SubscriptionDto | null>`

#### Return Properties
- `SubscriptionDto` when found.
- `null` when missing.

#### Expected Results
- Loads subscription via repository and maps to DTO.

#### Potential Errors

| Error | When |
| --- | --- |
| _None_ | Missing subscriptions return `null`. |

#### Example
```typescript
const subscription = await subscriptions.getSubscription('sub_1001');
```

### listSubscriptions

#### Description
Lists subscriptions using simple filters (customer/product/plan/status) with pagination.

#### Signature
```typescript
listSubscriptions(filters?: SubscriptionFilterDto): Promise<SubscriptionDto[]>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `filters` | `SubscriptionFilterDto` | No | Optional filter object (defaults limit 50, offset 0). |

#### Returns
`Promise<SubscriptionDto[]>`

#### Expected Results
- Validates filters.
- Resolves external keys to IDs; returns empty array if lookups fail.
- Queries the status view so status filters reflect real time.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | Filters invalid. |

#### Example
```typescript
const activeSubs = await subscriptions.listSubscriptions({
  productKey: 'pro-suite',
  status: 'active'
});
```

### findSubscriptions

#### Description
Performs advanced filtering with date ranges, metadata queries, and feature override criteria.

#### Signature
```typescript
findSubscriptions(filters: DetailedSubscriptionFilterDto): Promise<SubscriptionDto[]>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `filters` | `DetailedSubscriptionFilterDto` | Yes | Rich filter object (dates, metadata, overrides, booleans). |

#### Returns
`Promise<SubscriptionDto[]>`

#### Expected Results
- Validates filters.
- Executes more complex SQL against the status view and supporting tables.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | Filters invalid. |

### getSubscriptionsByCustomer

#### Description
Returns all subscriptions for a specific customer key.

#### Signature
```typescript
getSubscriptionsByCustomer(customerKey: string): Promise<SubscriptionDto[]>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `customerKey` | `string` | Yes | Customer identifier. |

#### Returns
`Promise<SubscriptionDto[]>`

#### Expected Results
- Ensures customer exists, then queries the status view for their subscriptions.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Customer key missing. |

#### Example
```typescript
const customerSubs = await subscriptions.getSubscriptionsByCustomer('cust_123');
```

### archiveSubscription

#### Description
Marks a subscription as archived (preventing further updates until unarchived).

#### Signature
```typescript
archiveSubscription(key: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription key to archive. |

#### Returns
`Promise<void>`

#### Expected Results
- Loads subscription, calls entity `archive()`, persists. Status automatically reflects change via the view.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription missing. |

#### Example
```typescript
await subscriptions.archiveSubscription('sub_legacy');
```

### unarchiveSubscription

#### Description
Clears the archived flag, allowing updates again.

#### Signature
```typescript
unarchiveSubscription(key: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription key to unarchive. |

#### Returns
`Promise<void>`

#### Expected Results
- Loads subscription, calls `unarchive()`, persists.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription missing. |

#### Example
```typescript
await subscriptions.unarchiveSubscription('sub_legacy');
```

### deleteSubscription

#### Description
Deletes a subscription record irrespective of status.

#### Signature
```typescript
deleteSubscription(key: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription key targeted for deletion. |

#### Returns
`Promise<void>`

#### Expected Results
- Loads subscription, ensures it exists, deletes record.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription missing. |

#### Example
```typescript
await subscriptions.deleteSubscription('sub_deprecated');
```

### addFeatureOverride

#### Description
Adds or updates a subscription-level feature override with optional override type.

#### Signature
```typescript
addFeatureOverride(
  subscriptionKey: string,
  featureKey: string,
  value: string,
  overrideType?: 'permanent' | 'temporary'
): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `subscriptionKey` | `string` | Yes | Target subscription key. |
| `featureKey` | `string` | Yes | Feature to override. |
| `value` | `string` | Yes | String value validated against feature type. |
| `overrideType` | `'permanent' | 'temporary'` | No | Defaults to `'permanent'`. |

#### Returns
`Promise<void>`

#### Expected Results
- Loads subscription; rejects if archived.
- Loads feature and validates value via `FeatureValueValidator`.
- Adds override (replacing existing entry) and saves.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription or feature missing. |
| `DomainError` | Subscription archived. |
| `ValidationError` | Value incompatible with feature type. |

#### Example
```typescript
await subscriptions.addFeatureOverride('sub_1001', 'max-projects', '200', 'temporary');
```

### removeFeatureOverride

#### Description
Removes a specific feature override from a subscription.

#### Signature
```typescript
removeFeatureOverride(subscriptionKey: string, featureKey: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `subscriptionKey` | `string` | Yes | Subscription key. |
| `featureKey` | `string` | Yes | Feature key to remove. |

#### Returns
`Promise<void>`

#### Expected Results
- Ensures subscription exists and is not archived.
- Removes override if present and persists.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription missing. |
| `DomainError` | Subscription archived. |

#### Example
```typescript
await subscriptions.removeFeatureOverride('sub_1001', 'max-projects');
```

### clearTemporaryOverrides

#### Description
Deletes only temporary overrides for a subscription.

#### Signature
```typescript
clearTemporaryOverrides(subscriptionKey: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `subscriptionKey` | `string` | Yes | Subscription key. |

#### Returns
`Promise<void>`

#### Expected Results
- Ensures subscription exists and is active.
- Removes overrides flagged as temporary and saves.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription missing. |
| `DomainError` | Subscription archived. |

#### Example
```typescript
await subscriptions.clearTemporaryOverrides('sub_1001');
```


> Need the full explanation of how each status works? See [`subscription-lifecycle.md`](./subscription-lifecycle.md) for detailed rules, diagrams, and practical guidance.

## DTO Reference

### CreateSubscriptionDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | `string` | Yes | 1–255 chars, alphanumeric with `-`/`_`. |
| `customerKey` | `string` | Yes | Existing customer key. |
| `billingCycleKey` | `string` | Yes | Existing billing cycle key (derives plan/product). |
| `activationDate` | <code>string &#124; Date</code> | No | Defaults to current time. |
| `expirationDate` | <code>string &#124; Date</code> | No | Optional. |
| `cancellationDate` | <code>string &#124; Date</code> | No | Optional. |
| `trialEndDate` | <code>string &#124; Date</code> | No | Optional; influences `trial` status. |
| `currentPeriodStart` | <code>string &#124; Date</code> | No | Defaults to now. |
| `currentPeriodEnd` | <code>string &#124; Date</code> | No | Calculated from billing cycle if omitted. |
| `stripeSubscriptionId` | `string` | No | Optional Stripe linkage; must be unique. |
| `metadata` | `Record<string, unknown>` | No | Free-form. |

### UpdateSubscriptionDto
Fields optional: `billingCycleKey`, `expirationDate`, `cancellationDate`, `trialEndDate`, `currentPeriodStart`, `currentPeriodEnd`, `stripeSubscriptionId`, `metadata`. Activation date and customer key are immutable.

### SubscriptionDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription identifier. |
| `customerKey` | `string` | Yes | Derived from customer. |
| `productKey` | `string` | Yes | Derived from plan. |
| `planKey` | `string` | Yes | Derived from billing cycle. |
| `billingCycleKey` | `string` | Yes | |
| `status` | `string` | Yes | `'pending'`, `'active'`, `'trial'`, `'cancelled'`, `'cancellation_pending'`, or `'expired'`. |
| `activationDate` | <code>string &#124; null</code> | No | |
| `expirationDate` | <code>string &#124; null</code> | No | |
| `cancellationDate` | <code>string &#124; null</code> | No | |
| `trialEndDate` | <code>string &#124; null</code> | No | |
| `currentPeriodStart` | <code>string &#124; null</code> | No | |
| `currentPeriodEnd` | <code>string &#124; null</code> | No | `null` when billing cycle duration is `forever`. |
| `stripeSubscriptionId` | <code>string &#124; null</code> | No | |
| `metadata` | <code>Record&lt;string, unknown&gt; &#124; null</code> | No | |
| `createdAt` | `string` | Yes | ISO timestamp. |
| `updatedAt` | `string` | Yes | ISO timestamp. |

### SubscriptionFilterDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `customerKey` | `string` | No | |
| `productKey` | `string` | No | |
| `planKey` | `string` | No | |
| `status` | Subscription status string | No | Filters by computed status (post-fetch). |
| `sortBy` | <code>'activationDate' &#124; 'expirationDate' &#124; 'createdAt' &#124; 'updatedAt' &#124; 'currentPeriodStart' &#124; 'currentPeriodEnd'</code> | No | |
| `sortOrder` | <code>'asc' &#124; 'desc'</code> | No | |
| `limit` | `number` | No | 1–100 (default 50). |
| `offset` | `number` | No | ≥0 (default 0). |

### DetailedSubscriptionFilterDto
Adds:
- `billingCycleKey`
- Date ranges: `activationDateFrom/To`, `expirationDateFrom/To`, `trialEndDateFrom/To`, `currentPeriodStartFrom/To`, `currentPeriodEndFrom/To`
- Booleans: `hasStripeId`, `hasTrial`, `hasFeatureOverrides`
- `featureKey`, `metadataKey`, `metadataValue`
- Pagination/sorting same as above.

## Related Workflows
- `FeatureCheckerService` relies on subscription data for resolving feature access; keep overrides up to date.
- `StripeIntegrationService` uses subscription CRUD for webhook synchronization.
- When deleting or transitioning plans/billing cycles, ensure subscriptions point to valid entities; run your own data migrations when changing plan relationships.
