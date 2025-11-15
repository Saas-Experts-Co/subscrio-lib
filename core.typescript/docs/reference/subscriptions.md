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

| Method | Description |
 | Returns
| --- | --- | --- |
| `createSubscription` | Creates a subscription for a customer + billing cycle | `Promise<SubscriptionDto>` |
| `updateSubscription` | Updates mutable lifecycle fields, metadata, or billing cycle | `Promise<SubscriptionDto>` |
| `getSubscription` | Retrieves a subscription by key | `Promise<SubscriptionDto \| null>` |
| `listSubscriptions` | Lists subscriptions via simple filters | `Promise<SubscriptionDto[]>` |
| `findSubscriptions` | Detailed filtering (date ranges, overrides, metadata) | `Promise<SubscriptionDto[]>` |
| `getSubscriptionsByCustomer` | Lists subscriptions for a customer | `Promise<SubscriptionDto[]>` |
| `archiveSubscription` | Flags a subscription as archived | `Promise<void>` |
| `unarchiveSubscription` | Clears archive flag | `Promise<void>` |
| `deleteSubscription` | Deletes a subscription | `Promise<void>` |
| `addFeatureOverride` | Adds/updates a feature override on a subscription | `Promise<void>` |
| `removeFeatureOverride` | Removes an override | `Promise<void>` |
| `clearTemporaryOverrides` | Removes only temporary overrides | `Promise<void>` |
| `processAutomaticTransitions` | Moves expired subscriptions to configured transition cycles | `Promise<number>` |

## Method Reference

### createSubscription
```typescript
createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionDto>
```

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dto` | `CreateSubscriptionDto` | Yes | Contains subscription key, customerKey, billingCycleKey, optional lifecycle dates (activation, expiration, cancellation, trial, current period), optional Stripe ID, metadata. |

#### Returns
 Persisted `SubscriptionDto` including derived customer, product, plan, and billing cycle keys.

#### Expected Results
- Validates DTO.
- Ensures customer exists.
- Loads billing cycle, plan, and product (derived).
- Ensures subscription key (and optional Stripe subscription ID) are unique.
- Calculates `currentPeriodEnd` when not provided using billing cycle duration.
- Persists subscription; status is computed by PostgreSQL when the subscription is read.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid or duration calculations fail. |
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
```typescript
updateSubscription(key: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDto>
```

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Subscription key to update. |
| `dto` | `UpdateSubscriptionDto` | Yes | Optional billingCycleKey, expiration/cancellation/trial/current period dates, Stripe ID, metadata. |

#### Expected Results
- Validates DTO (and notes whether trial end was explicitly cleared).
- Loads subscription; fails if archived (cannot update).
- Updates lifecycle fields; if billing cycle changes, also updates plan ID accordingly.
- Saves changes and relies on the database view to reflect the latest status.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid. |
| `NotFoundError` | Subscription or new billing cycle missing. |
| `DomainError` | Subscription is archived (must unarchive first). |

### getSubscription
```typescript
getSubscription(key: string): Promise<SubscriptionDto | null>
```

#### Returns
 DTO or `null`; no errors thrown.

### listSubscriptions
```typescript
listSubscriptions(filters?: SubscriptionFilterDto): Promise<SubscriptionDto[]>
```

#### Expected Results
- Validates filters.
- Resolves customer/product/plan keys to internal IDs; returns `[]` if any required key is missing.
- Queries a materialized view for real-time status; status filters happen directly in SQL.

**Errors `ValidationError` for invalid filters.

### findSubscriptions
```typescript
findSubscriptions(filters: DetailedSubscriptionFilterDto): Promise<SubscriptionDto[]>
```

Extends `listSubscriptions` with date ranges, metadata filters, feature override filters, etc.

**Errors `ValidationError` for invalid filters.

### getSubscriptionsByCustomer
```typescript
getSubscriptionsByCustomer(customerKey: string): Promise<SubscriptionDto[]>
```

**Errors `NotFoundError` if customer missing.

### archiveSubscription / unarchiveSubscription
```typescript
archiveSubscription(key: string): Promise<void>
unarchiveSubscription(key: string): Promise<void>
```

#### Expected Results
 Loads subscription, toggles archive flag, saves. Status automatically reflects changes via the view.

**Errors `NotFoundError` if subscription missing.

### deleteSubscription
```typescript
deleteSubscription(key: string): Promise<void>
```

Deletes record regardless of status (no additional checks). Errors only when subscription missing.

### addFeatureOverride
```typescript
addFeatureOverride(
  subscriptionKey: string,
  featureKey: string,
  value: string,
  overrideType?: 'permanent' | 'temporary'
): Promise<void>
```

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `subscriptionKey` | `string` | Yes | Target subscription. |
| `featureKey` | `string` | Yes | Feature to override. |
| `value` | `string` | Yes | Stored string validated against feature type. |
| `overrideType` | `'permanent' \| 'temporary'` | No | Defaults to `'permanent'`. |

#### Expected Results
- Loads subscription; rejects if archived.
- Loads feature; validates value via `FeatureValueValidator`.
- Adds override (replacing existing for the same feature) and saves.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription or feature missing. |
| `DomainError` | Subscription archived (must unarchive first). |
| `ValidationError` | Value incompatible with feature type. |

### removeFeatureOverride
```typescript
removeFeatureOverride(subscriptionKey: string, featureKey: string): Promise<void>
```

#### Expected Results
 Ensures subscription exists and not archived, removes override, saves.

**Errors `NotFoundError`, `DomainError` (archived).

### clearTemporaryOverrides
```typescript
clearTemporaryOverrides(subscriptionKey: string): Promise<void>
```

Removes only temporary overrides; same error behavior as other override methods.

### processAutomaticTransitions
```typescript
processAutomaticTransitions(): Promise<number>
```

#### Expected Results
- Scans subscriptions whose `currentPeriodEnd` has passed.
- For subscriptions whose plan configures `onExpireTransitionToBillingCycleKey`, moves subscription to the target billing cycle/plan, resets periods, clears overrides, saves (status updates automatically through the view).
- #### Returns
 the number of processed transitions.

#### Potential Errors

| Error | When |
| --- | --- |
| `DomainError` | Plan lacks transition configuration when processing (should not happen if properly configured). |
| `NotFoundError` | Target billing cycle or plan referenced by transition is missing. |

*Note*: Missing plan/cycle references log errors but may throw, depending on the path (`processSubscriptionTransition`). Ensure referential integrity.

> Need the full explanation of how each status works? See [`subscription-lifecycle.md`](./subscription-lifecycle.md) for detailed rules, diagrams, and practical guidance.

## DTO Reference

### CreateSubscriptionDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | `string` | Yes | 1–255 chars, alphanumeric with `-`/`_`. |
| `customerKey` | `string` | Yes | Existing customer key. |
| `billingCycleKey` | `string` | Yes | Existing billing cycle key (derives plan/product). |
| `activationDate` | `string \| Date` | No | Defaults to current time. |
| `expirationDate` | `string \| Date` | No | Optional. |
| `cancellationDate` | `string \| Date` | No | Optional. |
| `trialEndDate` | `string \| Date` | No | Optional; influences `trial` status. |
| `currentPeriodStart` | `string \| Date` | No | Defaults to now. |
| `currentPeriodEnd` | `string \| Date` | No | Calculated from billing cycle if omitted. |
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
| `activationDate` | `string \| null` | No | |
| `expirationDate` | `string \| null` | No | |
| `cancellationDate` | `string \| null` | No | |
| `trialEndDate` | `string \| null` | No | |
| `currentPeriodStart` | `string \| null` | No | |
| `currentPeriodEnd` | `string \| null` | No | `null` when billing cycle duration is `forever`. |
| `stripeSubscriptionId` | `string \| null` | No | |
| `metadata` | `Record<string, unknown> \| null` | No | |
| `createdAt` | `string` | Yes | ISO timestamp. |
| `updatedAt` | `string` | Yes | ISO timestamp. |

### SubscriptionFilterDto
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `customerKey` | `string` | No | |
| `productKey` | `string` | No | |
| `planKey` | `string` | No | |
| `status` | Subscription status string | No | Filters by computed status (post-fetch). |
| `sortBy` | `'activationDate' \| 'expirationDate' \| 'createdAt' \| 'updatedAt' \| 'currentPeriodStart' \| 'currentPeriodEnd'` | No | |
| `sortOrder` | `'asc' \| 'desc'` | No | |
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
- When deleting or transitioning plans/billing cycles, ensure subscriptions point to valid entities—use `processAutomaticTransitions` to move customers between plans automatically.
