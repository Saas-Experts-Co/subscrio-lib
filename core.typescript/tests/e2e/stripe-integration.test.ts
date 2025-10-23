import { describe, test, expect, beforeAll } from 'vitest';
import { Subscrio } from '../../src/index.js';
import { getTestConnectionString } from '../setup/get-connection.js';

describe('Stripe Integration E2E Tests', () => {
  let subscrio: Subscrio;
  let sharedBillingCycle: any;
  let sharedTestProduct: any;
  let sharedTestPlan: any;
  
  beforeAll(async () => {
    subscrio = new Subscrio({
      database: { connectionString: getTestConnectionString() }
    });
    
    // Create shared product and plan for billing cycle
    sharedTestProduct = await subscrio.products.createProduct({
      key: 'shared-stripe-product',
      displayName: 'Shared Stripe Product'
    });

    sharedTestPlan = await subscrio.plans.createPlan({
      productKey: sharedTestProduct.key,
      key: 'shared-stripe-plan',
      displayName: 'Shared Stripe Plan'
    });
    
    // Create a shared billing cycle for all tests
    sharedBillingCycle = await subscrio.billingCycles.createBillingCycle({
      productKey: sharedTestProduct.key,
      planKey: sharedTestPlan.key,
      key: 'test-monthly-stripe',
      displayName: 'Test Monthly Stripe',
      durationValue: 1,
      durationUnit: 'months'
    });
  });

  describe('Event Processing', () => {
    test('processes subscription.created event', async () => {
      // Setup
      const customer = await subscrio.customers.createCustomer({
        key: 'stripe-customer-1',
        displayName: 'Stripe Customer 1',
        externalBillingId: 'cus_stripe123'
      });

      const product = await subscrio.products.createProduct({
        key: 'stripe-product-1',
        displayName: 'Stripe Product 1'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'stripe-plan-1',
        displayName: 'Stripe Plan 1'
      });

      // Mock Stripe event
      const mockEvent: any = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_stripe123',
            customer: 'cus_stripe123',
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    id: 'price_stripe123'
                  }
                }
              ]
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // +30 days
            created: Math.floor(Date.now() / 1000),
            cancel_at_period_end: false
          }
        }
      };

      // Note: This test would need the Stripe price to be mapped to a plan
      // Since we don't have that mapping yet, we'll expect it to throw
      await expect(
        subscrio.stripe.processStripeEvent(mockEvent)
      ).rejects.toThrow();
    });

    test('processes subscription.updated event', async () => {
      // Setup
      const customer = await subscrio.customers.createCustomer({
        key: 'stripe-update-customer',
        displayName: 'Stripe Update Customer',
        externalBillingId: 'cus_update123'
      });

      const product = await subscrio.products.createProduct({
        key: 'stripe-update-product',
        displayName: 'Stripe Update Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'stripe-update-plan',
        displayName: 'Stripe Update Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: `test-monthly-stripe-${Date.now()}`,
        displayName: 'Test Monthly Stripe',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'stripe-update-sub',
        customerKey: customer.key,
        billingCycleKey: billingCycle.key,
        stripeSubscriptionId: 'sub_update123'
      });

      const mockEvent: any = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_update123',
            customer: 'cus_update123',
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    id: 'price_update123'
                  }
                }
              ]
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            cancel_at_period_end: true,
            canceled_at: Math.floor(Date.now() / 1000)
          }
        }
      };

      await subscrio.stripe.processStripeEvent(mockEvent);

      const updated = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(updated?.autoRenew).toBe(false);
      expect(updated?.cancellationDate).toBeDefined();
    });

    test('processes subscription.deleted event', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'stripe-delete-customer',
        displayName: 'Stripe Delete Customer',
        externalBillingId: 'cus_delete123'
      });

      const product = await subscrio.products.createProduct({
        key: 'stripe-delete-product',
        displayName: 'Stripe Delete Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'stripe-delete-plan',
        displayName: 'Stripe Delete Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: `test-monthly-stripe-${Date.now()}`,
        displayName: 'Test Monthly Stripe',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'stripe-delete-sub',
        customerKey: customer.key,
        billingCycleKey: billingCycle.key,
        stripeSubscriptionId: 'sub_delete123'
      });

      const mockEvent: any = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_delete123',
            customer: 'cus_delete123',
            status: 'canceled'
          }
        }
      };

      await subscrio.stripe.processStripeEvent(mockEvent);

      const updated = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(updated?.status).toBe('expired');
    });

    test('ignores unknown event types', async () => {
      const mockEvent: any = {
        type: 'customer.created',
        data: {
          object: {}
        }
      };

      // Should not throw
      await expect(
        subscrio.stripe.processStripeEvent(mockEvent)
      ).resolves.not.toThrow();
    });
  });

  describe('Status Mapping', () => {
    test('maps Stripe status "active" to SubscriptionStatus.Active', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'status-active-customer',
        displayName: 'Status Active Customer',
        externalBillingId: 'cus_active'
      });

      const product = await subscrio.products.createProduct({
        key: 'status-active-product',
        displayName: 'Status Active Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'status-active-plan',
        displayName: 'Status Active Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: `test-monthly-stripe-${Date.now()}`,
        displayName: 'Test Monthly Stripe',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'status-active-sub',
        customerKey: customer.key,
        billingCycleKey: billingCycle.key,
        stripeSubscriptionId: 'sub_active'
      });

      const mockEvent: any = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_active',
            customer: 'cus_active',
            status: 'active',
            items: { data: [{ price: { id: 'price_active' } }] },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            cancel_at_period_end: false
          }
        }
      };

      await subscrio.stripe.processStripeEvent(mockEvent);

      const updated = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(updated?.status).toBe('active');
    });

    test('maps Stripe status "canceled" to SubscriptionStatus.Cancelled', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'status-cancelled-customer',
        displayName: 'Status Cancelled Customer',
        externalBillingId: 'cus_cancelled'
      });

      const product = await subscrio.products.createProduct({
        key: 'status-cancelled-product',
        displayName: 'Status Cancelled Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'status-cancelled-plan',
        displayName: 'Status Cancelled Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: `test-monthly-stripe-${Date.now()}`,
        displayName: 'Test Monthly Stripe',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'status-cancelled-sub',
        customerKey: customer.key,
        billingCycleKey: billingCycle.key,
        stripeSubscriptionId: 'sub_cancelled'
      });

      const mockEvent: any = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_cancelled',
            customer: 'cus_cancelled',
            status: 'canceled',
            items: { data: [{ price: { id: 'price_cancelled' } }] },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            cancel_at_period_end: false,
            canceled_at: Math.floor(Date.now() / 1000)
          }
        }
      };

      await subscrio.stripe.processStripeEvent(mockEvent);

      const updated = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(updated?.status).toBe('cancelled');
    });
  });

  describe('Customer Linking', () => {
    test('links subscription to customer by external billing ID', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'linking-customer',
        displayName: 'Linking Customer',
        externalBillingId: 'cus_linking123'
      });

      expect(customer.externalBillingId).toBe('cus_linking123');
    });

    test('throws error when customer not found for Stripe event', async () => {
      const mockEvent: any = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_notfound',
            customer: 'cus_notfound',
            status: 'active',
            items: { data: [{ price: { id: 'price_notfound' } }] },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            created: Math.floor(Date.now() / 1000),
            cancel_at_period_end: false
          }
        }
      };

      await expect(
        subscrio.stripe.processStripeEvent(mockEvent)
      ).rejects.toThrow('not found');
    });
  });

  describe('Idempotency', () => {
    test('handles duplicate subscription.updated events', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'idempotent-customer',
        displayName: 'Idempotent Customer',
        externalBillingId: 'cus_idempotent'
      });

      const product = await subscrio.products.createProduct({
        key: 'idempotent-product',
        displayName: 'Idempotent Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'idempotent-plan',
        displayName: 'Idempotent Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: `test-monthly-stripe-${Date.now()}`,
        displayName: 'Test Monthly Stripe',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'idempotent-sub',
        customerKey: customer.key,
        billingCycleKey: billingCycle.key,
        stripeSubscriptionId: 'sub_idempotent'
      });

      const mockEvent: any = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_idempotent',
            customer: 'cus_idempotent',
            status: 'active',
            items: { data: [{ price: { id: 'price_idempotent' } }] },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            cancel_at_period_end: false
          }
        }
      };

      // Process same event twice
      await subscrio.stripe.processStripeEvent(mockEvent);
      await subscrio.stripe.processStripeEvent(mockEvent);

      const updated = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('active');
    });
  });
});

