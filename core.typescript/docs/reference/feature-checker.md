
# Feature Checker Service Reference

## Service Overview
Feature Checker provides runtime evaluation of feature values for subscriptions and customers. It resolves values according to the invariant:

`subscription override → plan value → feature default`

The service supports subscription-level queries, customer/product queries (across multiple active subscriptions), plan access checks, and aggregated usage summaries. All methods rely on `FeatureValueResolver` to enforce the hierarchy.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const featureChecker = subscrio.featureChecker;
```

## Method Catalog

| Method | Description |
 | Returns
| --- | --- | --- |
| `getValueForSubscription` | Resolves a feature for a specific subscription | `Promise<T \| null>` |
| `isEnabledForSubscription` | Boolean helper for toggle features | `Promise<boolean>` |
| `getAllFeaturesForSubscription` | Resolves every feature for a subscription’s product | `Promise<Map<string, string>>` |
| `getValueForCustomer` | Resolves a feature for a customer/product combination | `Promise<T \| null>` |
| `isEnabledForCustomer` | Boolean helper for toggle features at customer level | `Promise<boolean>` |
| `getAllFeaturesForCustomer` | Resolves all feature values for a customer/product pair | `Promise<Map<string, string>>` |
| `hasPlanAccess` | Determines if a customer currently has an active/trial subscription to a plan | `Promise<boolean>` |
| `getActivePlans` | Lists active plan keys for a customer | `Promise<string[]>` |
| `getFeatureUsageSummary` | Aggregates enabled/disabled/numeric/text values for reporting | `Promise<FeatureUsageSummary>` |

## Method Reference

### getValueForSubscription

#### Description
 Resolves a feature value for a subscription using override → plan value → feature default order.

#### Signature
```typescript
getValueForSubscription<T = string>(
  subscriptionKey: string,
  featureKey: string,
  defaultValue?: T
): Promise<T | null>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `subscriptionKey` | `string` | Yes | Subscription identifier. |
| `featureKey` | `string` | Yes | Feature key to resolve. |
| `defaultValue` | `T` | No | Fallback when subscription/plan/feature missing. |

#### Returns
`Promise<T | null>` – resolved value (converted to `T` when provided) or fallback.

#### Expected Results
- Loads subscription, plan, and feature.
- Applies override/plan/default order; when any entity missing returns `defaultValue ?? null`.

#### Potential Errors
- None (missing data results in fallback).

#### Example
```typescript
const seats = await featureChecker.getValueForSubscription<number>(
  'sub_1001',
  'seat-limit',
  0
);
```

### isEnabledForSubscription

#### Description
 Convenience boolean check for toggle features on a subscription.

#### Signature
```typescript
isEnabledForSubscription(subscriptionKey: string, featureKey: string): Promise<boolean>
```

#### Returns
`Promise<boolean>` – `true` when resolved value equals `'true'` (case-insensitive).

### getAllFeaturesForSubscription

#### Description
 Resolves every feature associated with the subscription’s product, returning a `Map<featureKey, string>`.

#### Signature
```typescript
getAllFeaturesForSubscription(subscriptionKey: string): Promise<Map<string, string>>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `subscriptionKey` | `string` | Yes | Subscription identifier. |

#### Returns
`Promise<Map<string, string>>`

#### Expected Results
- Loads subscription, plan, product, and all features linked to the product.
- Resolves each feature using override/plan/default order and populates the map.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Subscription missing or product cannot be resolved. (Missing plan results in empty map rather than error.) |

### getValueForCustomer

#### Description
 Resolves a feature value for a customer/product pair across their active/trial subscriptions.

#### Signature
```typescript
getValueForCustomer<T = string>(
  customerKey: string,
  productKey: string,
  featureKey: string,
  defaultValue?: T
): Promise<T | null>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `customerKey` | `string` | Yes | Customer identifier. |
| `productKey` | `string` | Yes | Product containing the feature. |
| `featureKey` | `string` | Yes | Feature to resolve. |
| `defaultValue` | `T` | No | Optional fallback. |

#### Returns
`Promise<T | null>`

#### Expected Results
- Loads customer, product, and feature; returns fallback if any missing.
- Fetches up to `MAX_SUBSCRIPTIONS_PER_CUSTOMER` subscriptions, filters to active/trial for the product.
- Applies resolver for each subscription, honoring override precedence when multiple subscriptions exist.

#### Potential Errors
- None (missing entities fall back to default).

### isEnabledForCustomer
Boolean helper built on `getValueForCustomer`, returning whether the resolved value equals `'true'`.

### getAllFeaturesForCustomer

#### Description
 Resolves every feature for a customer/product combination by aggregating across active/trial subscriptions.

#### Signature
```typescript
getAllFeaturesForCustomer(
  customerKey: string,
  productKey: string
): Promise<Map<string, string>>
```

#### Returns
`Promise<Map<string, string>>` – empty map when customer/product missing or no active subscriptions.

### hasPlanAccess

#### Description
 Determines whether a customer currently has an active/trial subscription to a specific plan.

#### Signature
```typescript
hasPlanAccess(
  customerKey: string,
  productKey: string,
  planKey: string
): Promise<boolean>
```

#### Expected Results
- Validates customer, product, and plan exist.
- Loads subscriptions for the customer and checks for an active/trial subscription referencing `planKey`.
- #### Returns
 `false` if any prerequisite entity is missing.

### getActivePlans

#### Description
 Lists plan keys for all active/trial subscriptions belonging to a customer (not filtered by product).

#### Signature
```typescript
getActivePlans(customerKey: string): Promise<string[]>
```

#### Returns
`Promise<string[]>` – empty array when customer missing or no active subscriptions.

### getFeatureUsageSummary

#### Description
 Provides a rollup of feature states (enabled/disabled/numeric/text) for a customer/product pair plus subscription counts.

#### Signature
```typescript
getFeatureUsageSummary(
  customerKey: string,
  productKey: string
): Promise<FeatureUsageSummary>
```

#### Return Properties

| Field | Type | Description |
| --- | --- | --- |
| `activeSubscriptions` | `number` | Count of subscriptions retrieved for the customer (regardless of product filter). |
| `enabledFeatures` | `string[]` | Feature keys resolved to `'true'`. |
| `disabledFeatures` | `string[]` | Feature keys resolved to `'false'`. |
| `numericFeatures` | `Map<string, number>` | Parsed numeric values keyed by feature key. |
| `textFeatures` | `Map<string, string>` | Text values keyed by feature key. |

#### Expected Results
- Loads customer/product; missing entities yield empty lists/maps and `activeSubscriptions = 0`.
- Retrieves all active/trial subscriptions for the product, resolves each feature, and classifies values by `FeatureDto.valueType`.

#### Potential Errors
- None (missing data results in empty structures).

## Related Workflows
- Ensure products associate features and plans set feature values; otherwise resolution falls back to feature defaults.
- Subscription overrides are managed via `SubscriptionManagementService.addFeatureOverride`.
- Consider caching results from `getAllFeaturesForCustomer` to reduce repeated resolver work in high-traffic scenarios.
