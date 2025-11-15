# How to Integrate with Stripe

This guide walks through the exact steps needed to keep Subscrio and Stripe in sync. The library already contains all of the handlers—your job is to provide the right metadata, map Stripe IDs to Subscrio records, and forward verified events to `subscrio.stripe.processStripeEvent`.

## Prerequisites

- `@subscrio/core` installed and configured with a reachable PostgreSQL database.
- `STRIPE_SECRET_KEY` available to your server-side code (never expose it to browsers).
- Ability to configure Stripe webhooks and create customers/subscriptions via the Stripe API or dashboard.

## 1. Map Stripe prices to billing cycles

Subscrio derives the plan automatically by looking up `BillingCycle.externalProductId`. For every Stripe price ID you sell, create (or update) a billing cycle and store the price ID:

```ts
await subscrio.billingCycles.createBillingCycle({
  planKey: 'basic-plan',
  key: 'basic-monthly',
  displayName: 'Basic – Monthly',
  durationValue: 1,
  durationUnit: 'months',
  externalProductId: 'price_12345'
});
```

## 2. Attach Subscrio metadata when creating Stripe entities

Every Stripe customer **must** include the Subscrio customer key in metadata so webhooks can backfill `externalBillingId`:

- `subscrioCustomerKey` – required when `Customer.externalBillingId` is blank.
- `subscrioSubscriptionKey` – optional; use it if you want Stripe to create/update a specific Subscrio subscription key. Otherwise Subscrio generates one (`sub_xxx`).

Example when creating a Stripe customer:

```ts
await stripe.customers.create({
  email: 'user@example.com',
  metadata: {
    subscrioCustomerKey: 'customer_acme_corp'
  }
});
```

When you create a Stripe subscription (through Checkout, Billing Portal, or the API), make sure the subscription metadata includes the same `subscrioCustomerKey` and, optionally, `subscrioSubscriptionKey`.

## 3. Receiving and verifying webhooks

Your HTTP endpoint must:

1. Read the **raw** request body (do not JSON-parse first).
2. Verify the signature with `stripe.webhooks.constructEvent`.
3. Pass the verified event to `subscrio.stripe.processStripeEvent`.

```ts
import express from 'express';
import Stripe from 'stripe';
import { Subscrio } from '@subscrio/core';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });

app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const sig = req.headers['stripe-signature']!;
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      await subscrio.stripe.processStripeEvent(event);
      res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({ error: 'Invalid webhook payload' });
    }
  }
);
```

Never call `processStripeEvent` with unverified JSON—Subscrio assumes the payload is genuine once it reaches the service.

## 4. Required Stripe events

Subscribe to the following event types in the Stripe dashboard (or CLI). They are the only ones that mutate Subscrio data:

| Event | What Subscrio does |
| --- | --- |
| `customer.created` / `customer.updated` | Looks up customers by `externalBillingId` or `subscrioCustomerKey` metadata and backfills the Stripe customer ID. |
| `customer.deleted` | Clears `externalBillingId` so future provisioning can recreate the link. |
| `customer.subscription.created` | Resolves the mapped billing cycle/plan and creates the Subscrio subscription (idempotent). |
| `customer.subscription.updated` | Updates plan/billing-cycle references, trial dates, cancellation status, and billing periods. |
| `customer.subscription.deleted` | Expires the subscription locally. |
| `invoice.payment_succeeded` | Updates `currentPeriodStart`/`currentPeriodEnd` from the invoice line period once payment clears. |

## 5. Data requirements for security and mapping

- **Database** – ensure every billing cycle that can be sold via Stripe has `externalProductId` set to the Stripe price ID.
- **Metadata** – always include `subscrioCustomerKey` (and optionally `subscrioSubscriptionKey`). Missing metadata causes `NotFoundError` so you can detect misconfigured flows quickly.
- **Secrets** – keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in server-side environment variables only.

## 6. End-to-end flow summary

1. Create the customer in Subscrio (stores the canonical customer key).
2. Create the same customer in Stripe, passing `subscrioCustomerKey`.
3. Stripe sends `customer.created`; Subscrio records the Stripe customer ID.
4. Create/checkout a Stripe subscription whose price matches `BillingCycle.externalProductId` and includes the same metadata.
5. Stripe emits `customer.subscription.created`; Subscrio creates the subscription and associates it with the mapped plan.
6. Whenever Stripe renews or cancels, the corresponding subscription/invoice webhooks keep Subscrio’s data up to date.

With these steps in place, Subscrio automatically mirrors Stripe’s lifecycle without any REST API calls—everything stays in process, type-safe, and consistent.


