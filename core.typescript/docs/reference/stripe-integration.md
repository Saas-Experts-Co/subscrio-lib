# Stripe Integration Service Reference

## Service Overview
`StripeIntegrationService` connects verified Stripe webhook events to Subscrio customers and subscriptions. Your infrastructure is responsible for signature verification—call `processStripeEvent` only after Stripe’s SDK validates the payload. The built-in handlers now cover customer lifecycle, subscription lifecycle, successful invoices, and a helper for bootstrapping Subscrio subscriptions that reference Stripe customers/prices.

- Store the Subscrio customer key in Stripe metadata (`subscrioCustomerKey`) whenever you create a Stripe customer or subscription—this allows webhooks to backfill `Customer.externalBillingId` automatically.
- Persist Stripe customer IDs in `Customer.externalBillingId`. If it’s missing, the webhook handler will backfill it using the metadata described above.
- Persist Stripe price IDs in `BillingCycle.externalProductId` so events can map to billing cycles (and therefore plans). Once the price is mapped, Subscrio can create and update subscriptions with no additional customization.

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
  - `customer.created`
  - `customer.updated`
  - `customer.deleted`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
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
- **`handleCustomerCreated/Updated`**
  - Resolves existing customers by `externalBillingId` or `subscrioCustomerKey` metadata and backfills the Stripe customer ID.
- **`handleCustomerDeleted`**
  - Clears `externalBillingId` when Stripe deletes a customer.
- **`handleSubscriptionCreated`**
  - Resolves the customer, billing cycle (via `externalProductId`), and owning plan, then creates or refreshes the Subscrio subscription with `stripeSubscriptionId`, period dates, and metadata.
- **`handleSubscriptionUpdated`**
  - Syncs plan/billing-cycle changes, period dates, and cancellation status for an existing subscription.
- **`handleSubscriptionDeleted`**
  - Calls `subscription.expire()` when Stripe marks the subscription deleted so the computed status becomes `expired`.
- **`handlePaymentSucceeded`**
  - Updates the subscription’s `currentPeriodStart`/`currentPeriodEnd` from the invoice line’s billing period after a successful payment.

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
- Generates a subscription key (or use one you pass in metadata), sets activation/current period timestamps, and saves the subscription.
- Leaves a placeholder `stripeSubscriptionId` for later reconciliation—webhooks will attach the real Stripe subscription once you pass the metadata described above.

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
- **Customer metadata** – Attach `subscrioCustomerKey` (and optionally `subscrioSubscriptionKey`) to every Stripe customer and subscription you create so Subscrio can reconcile records automatically.
- **Billing-cycle mapping** – Store Stripe price IDs in `BillingCycle.externalProductId` to map subscriptions/billing cycles accurately.
- **Reference guide** – See `docs/reference/how-to-integrate-with-stripe.md` for an end-to-end walkthrough that covers setup, metadata, and webhook handling.
