# Stripe Integration Service Reference

## Service Overview
`StripeIntegrationService` connects verified Stripe webhook events to Subscrio subscriptions. Your infrastructure is responsible for signature verification—call `processStripeEvent` only after Stripe’s SDK validates the payload. The built-in handlers cover subscription lifecycle events, payment success/failure, and a helper for bootstrapping Subscrio subscriptions that reference Stripe customers/prices.

- Persist Stripe customer IDs in `Customer.externalBillingId` so events can resolve customers.
- Persist Stripe price IDs in `BillingCycle.externalProductId` so events can map to billing cycles (and therefore plans).
- Plan mapping for new subscriptions is left to implementors; the default handler throws until you add custom logic.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const stripeService = subscrio.stripe;
```

## Method Catalog

| Method | Description | Returns |
| --- | --- | --- |
| `processStripeEvent` | Entry point for verified Stripe webhook events | `Promise<void>` |
| `createStripeSubscription` | Helper to create a Subscrio subscription tied to Stripe metadata | `Promise<Subscription>` |

*(Handlers invoked internally by `processStripeEvent` are described for completeness.)*

## Method Reference

### processStripeEvent

#### Description
Routes a verified `Stripe.Event` to the appropriate handler (subscription lifecycle or invoice events).

#### Signature
```typescript
processStripeEvent(event: Stripe.Event): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `event` | `Stripe.Event` | Yes | Stripe webhook payload that your endpoint already verified. |

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
- Unhandled event types are ignored (logged in development).
- Missing entities (customer, plan, billing cycle, subscription) throw so you can fix data mapping.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Customer, billing cycle, plan, or subscription cannot be resolved. |
| `ValidationError` | Required data such as `externalBillingId` is missing. |

#### Example
```typescript
import Stripe from 'stripe';

const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
await stripeService.processStripeEvent(event);
```

#### Internal Handlers
- **`handleSubscriptionCreated`**
  - Loads customer by `externalBillingId`.
  - Attempts to map Stripe price ID → billing cycle via `externalProductId`.
  - Throws `NotFoundError` today to force implementors to supply plan mapping logic.
- **`handleSubscriptionUpdated`**
  - Syncs current period start/end and cancellation state from Stripe onto the local subscription.
- **`handleSubscriptionDeleted`**
  - Calls `subscription.expire()` when Stripe marks the subscription deleted.
- **`handlePaymentSucceeded` / `handlePaymentFailed`**
  - Finds the subscription by `stripeSubscriptionId` and updates timestamps/status placeholders for future expansion.
- **`handleTrialWillEnd`**
  - Hook for notifications; currently logs in development environments.

### createStripeSubscription

#### Description
Bootstraps a Subscrio subscription linked to Stripe metadata (customer/billing-cycle) while you build deeper automation.

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
| `customerKey` | `string` | Yes | Customer key (must have `externalBillingId`). |
| `planKey` | `string` | Yes | Plan being subscribed to. |
| `billingCycleKey` | `string` | Yes | Billing cycle governing the cadence. |
| `stripePriceId` | `string` | Yes | Stripe price identifier (stored for reference). |

#### Returns
`Promise<Subscription>` – the saved domain subscription (with placeholder `stripeSubscriptionId`).

#### Expected Results
- Validates entities and ensures customer has `externalBillingId`.
- Generates a subscription key, sets activation/current period timestamps, and saves the subscription.
- Leaves a placeholder `stripeSubscriptionId` for later reconciliation.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Customer, plan, or billing cycle missing. |
| `ValidationError` | Customer lacks `externalBillingId`. |

#### Example
```typescript
const sub = await stripeService.createStripeSubscription(
  'cust_123',
  'pro-plan',
  'pro-plan-annual',
  'price_ABC123'
);
console.log(sub.key);
```

## Related Workflows
- **Webhook verification** – Your HTTP endpoint must verify Stripe signatures with `stripe.webhooks.constructEvent` (or equivalent) before calling `processStripeEvent`.
- **Customer sync** – Persist Stripe customer IDs to `Customer.externalBillingId` when provisioning accounts so events can resolve them.
- **Billing-cycle mapping** – Store Stripe price IDs in `BillingCycle.externalProductId` to map subscriptions/billing cycles accurately.
- **Extend handlers** – Customize `handleSubscriptionCreated` (and others) to map Stripe subscriptions to your plan structure and to push data back to Stripe when needed.
