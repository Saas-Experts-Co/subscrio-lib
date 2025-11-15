# Stripe Integration Service Reference

## Service Overview
The Stripe Integration Service synchronizes verified Stripe webhook events with Subscrio subscriptions. #### Signature
 verification happens outside of Subscrio (your webhook endpoint must verify before calling `processStripeEvent`). The service currently focuses on subscription lifecycle handling, payment status updates, and scaffolding for plan/billing-cycle mapping.

- Store Stripe customer IDs in `Customer.externalBillingId` so events can resolve the correct customer.
- Store Stripe price IDs in `BillingCycle.externalProductId` to map to plan/billing cycle combinations.
- The default handlers log unimplemented portions (e.g., plan mapping). Extend them as needed for your deployment.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const stripeService = subscrio.stripe;
```

## Method Catalog

| Method | Description |
 | Returns
| --- | --- | --- |
| `processStripeEvent` | Entrypoint for verified Stripe webhook events | `Promise<void>` |
| `createStripeSubscription` | Helper to create a placeholder Subscrio subscription tied to Stripe | `Promise<Subscription>` |

*(Handlers invoked by `processStripeEvent` are internal but documented below for completeness.)*

## Method Reference

### processStripeEvent

#### Description
 Consumes a verified `Stripe.Event` and routes it to the appropriate handler.

#### Signature
```typescript
processStripeEvent(event: Stripe.Event): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `event` | `Stripe.Event` | Yes | Fully verified Stripe webhook payload. |

#### Returns
`Promise<void>`

#### Expected Results
- Switches on `event.type` and handles:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Unhandled event types are ignored (logged for observability).

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Handler cannot resolve required Subscrio entities (customer, plan, billing cycle, subscription). |
| `ValidationError` | Misconfigured data detected (e.g., missing `externalBillingId`). |

### Stripe Event Handlers (internal)
- **`handleSubscriptionCreated`**
  - Looks up the customer via `externalBillingId`.
  - Attempts to find a billing cycle using Stripe price ID (`externalProductId`).
  - Throws `NotFoundError` today as a reminder to implement plan mapping logic tailored to your billing setup.
- **`handleSubscriptionUpdated`**
  - Syncs period start/end, status, and renewal dates from Stripe payload.
- **`handleSubscriptionDeleted`**
  - Marks the Subscrio subscription expired.
- **`handlePaymentSucceeded` / `handlePaymentFailed`**
  - Updates subscription/payment status accordingly.
- **`handleTrialWillEnd`**
  - Hook for sending notifications or triggering workflows.

### createStripeSubscription

#### Description
 Helper for implementations that need to bootstrap a Subscrio subscription tied to a Stripe customer/price before full automation is built.

#### Signature
```typescript
createStripeSubscription(
  customerKey: string,
  planKey: string,
  billingCycleKey: string,
  stripePriceId: string
): Promise<Subscription>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `customerKey` | `string` | Yes | Customer in Subscrio (must have `externalBillingId`). |
| `planKey` | `string` | Yes | Plan being subscribed to. |
| `billingCycleKey` | `string` | Yes | Billing cycle governing cadence. |
| `stripePriceId` | `string` | Yes | Stripe price ID (currently stored for reference). |

#### Returns
`Promise<Subscription>` – domain subscription entity (with placeholder Stripe subscription ID).

#### Expected Results
- Ensures customer exists and has `externalBillingId`.
- Ensures plan and billing cycle exist.
- Generates a subscription key, sets activation/current period dates, and saves the subscription with a placeholder `stripeSubscriptionId`.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Customer, plan, or billing cycle missing. |
| `ValidationError` | Customer lacks `externalBillingId`. |

#### Example
```typescript
const sub = await stripeService.createStripeSubscription(
  'cust_123',
  'annual-pro',
  'annual-pro-12m',
  'price_123'
);
```

## Related Workflows
- **Webhook verification Your HTTP endpoint must verify Stripe signatures before calling `processStripeEvent`.
- **Customer sync Persist Stripe customer IDs to `Customer.externalBillingId` when provisioning users.
- **Billing cycle mapping Store Stripe price IDs in `BillingCycle.externalProductId` to help resolve incoming subscription events.
- **Extending handlers Customize handler logic (especially plan mapping) to align with your Stripe product/price structure.
