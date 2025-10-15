import { describe, test, expect, beforeAll } from 'vitest';
import { Subscrio } from '../../src/index.js';
import { getTestConnectionString } from '../setup/get-connection.js';

describe('Subscriptions E2E Tests', () => {
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
      key: 'shared-test-product',
      displayName: 'Shared Test Product'
    });

    sharedTestPlan = await subscrio.plans.createPlan({
      productKey: sharedTestProduct.key,
      key: 'shared-test-plan',
      displayName: 'Shared Test Plan'
    });
    
    // Create a shared billing cycle for all tests
    sharedBillingCycle = await subscrio.billingCycles.createBillingCycle({
      productKey: sharedTestProduct.key,
      planKey: sharedTestPlan.key,
      key: 'test-monthly',
      displayName: 'Test Monthly',
      durationValue: 1,
      durationUnit: 'months'
    });
  });

  describe('CRUD Operations', () => {
    test('creates a subscription with valid data', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'sub-customer-1',
        displayName: 'Sub Customer 1'
      });

      const product = await subscrio.products.createProduct({
        key: 'sub-product-1',
        displayName: 'Sub Product 1'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'sub-plan-1',
        displayName: 'Sub Plan 1'
      });

      // Create billing cycle for this specific plan
      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'subscription-1',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      expect(subscription).toBeDefined();
      expect(subscription.key).toBe('subscription-1');
      expect(subscription.customerKey).toBe(customer.key);
      expect(subscription.productKey).toBe(product.key);
      expect(subscription.planKey).toBe(plan.key);
      expect(subscription.billingCycleKey).toBe(sharedBillingCycle.key);
      expect(subscription.status).toBe('active');
      expect(subscription.autoRenew).toBe(true);
    });

    test('creates subscription with trial period', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'trial-customer',
        displayName: 'Trial Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'trial-product',
        displayName: 'Trial Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'trial-plan',
        displayName: 'Trial Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'trial-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key,
        trialEndDate: trialEnd.toISOString()
      });

      expect(subscription.trialEndDate).toBeDefined();
    });

    test('retrieves subscription by key', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'retrieve-sub-customer',
        displayName: 'Retrieve Sub Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'retrieve-sub-product',
        displayName: 'Retrieve Sub Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'retrieve-sub-plan',
        displayName: 'Retrieve Sub Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const created = await subscrio.subscriptions.createSubscription({
        key: 'retrieve-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const retrieved = await subscrio.subscriptions.getSubscription(created.key);
      expect(retrieved).toBeDefined();
      expect(retrieved?.key).toBe(created.key);
    });

    test('updates subscription auto-renew setting', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'update-sub-customer',
        displayName: 'Update Sub Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'update-sub-product',
        displayName: 'Update Sub Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'update-sub-plan',
        displayName: 'Update Sub Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'update-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const updated = await subscrio.subscriptions.updateSubscription(subscription.key, {
        autoRenew: false
      });

      expect(updated.autoRenew).toBe(false);
    });

    test('returns null for non-existent subscription', async () => {
      const result = await subscrio.subscriptions.getSubscription('non-existent-subscription');
      expect(result).toBeNull();
    });
  });

  describe('Validation Tests', () => {
    test('throws error when billing cycle is missing', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'no-billing-customer',
        displayName: 'No Billing Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'no-billing-product',
        displayName: 'No Billing Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'no-billing-plan',
        displayName: 'No Billing Plan'
      });

      await expect(
        subscrio.subscriptions.createSubscription({
          key: 'no-billing-subscription',
          customerKey: customer.key,
          productKey: product.key,
          planKey: plan.key
          // Missing billingCycleKey - should fail
        } as any)
      ).rejects.toThrow();
    });

    test('throws error for non-existent billing cycle', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'invalid-billing-customer',
        displayName: 'Invalid Billing Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'invalid-billing-product',
        displayName: 'Invalid Billing Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'invalid-billing-plan',
        displayName: 'Invalid Billing Plan'
      });

      await expect(
        subscrio.subscriptions.createSubscription({
          key: 'invalid-billing-subscription',
          customerKey: customer.key,
          productKey: product.key,
          planKey: plan.key,
          billingCycleKey: 'non-existent-billing-cycle'
        })
      ).rejects.toThrow('not found');
    });

    test('throws error for non-existent customer', async () => {
      const product = await subscrio.products.createProduct({
        key: 'error-customer-product',
        displayName: 'Error Customer Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'error-customer-plan',
        displayName: 'Error Customer Plan'
      });

      await expect(
        subscrio.subscriptions.createSubscription({
          key: 'error-customer-sub',
          customerKey: 'non-existent-customer',
          productKey: product.key,
          planKey: plan.key,
          billingCycleKey: sharedBillingCycle.key
        })
      ).rejects.toThrow('not found');
    });

    test('throws error for non-existent product', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'error-product-customer',
        displayName: 'Error Product Customer'
      });

      await expect(
        subscrio.subscriptions.createSubscription({
          key: 'error-product-sub',
          customerKey: customer.key,
          productKey: 'non-existent-product',
          planKey: 'any-plan',
          billingCycleKey: sharedBillingCycle.key
        })
      ).rejects.toThrow('not found');
    });

    test('throws error for non-existent plan', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'error-plan-customer',
        displayName: 'Error Plan Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'error-plan-product',
        displayName: 'Error Plan Product'
      });

      await expect(
        subscrio.subscriptions.createSubscription({
          key: 'error-plan-sub',
          customerKey: customer.key,
          productKey: product.key,
          planKey: 'non-existent-plan',
          billingCycleKey: sharedBillingCycle.key
        })
      ).rejects.toThrow('not found');
    });

    test('throws error for duplicate subscription key', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'duplicate-sub-customer',
        displayName: 'Duplicate Sub Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'duplicate-sub-product',
        displayName: 'Duplicate Sub Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'duplicate-sub-plan',
        displayName: 'Duplicate Sub Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'duplicate-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await expect(
        subscrio.subscriptions.createSubscription({
          key: 'duplicate-subscription',
          customerKey: customer.key,
          productKey: product.key,
          planKey: plan.key,
          billingCycleKey: billingCycle.key
        })
      ).rejects.toThrow('already exists');
    });

    test('throws error for invalid key format', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'invalid-key-customer',
        displayName: 'Invalid Key Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'invalid-key-product',
        displayName: 'Invalid Key Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'invalid-key-plan',
        displayName: 'Invalid Key Plan'
      });

      await expect(
        subscrio.subscriptions.createSubscription({
          key: 'Invalid Key!',
          customerKey: customer.key,
          productKey: product.key,
          planKey: plan.key
        })
      ).rejects.toThrow();
    });
  });

  describe('Status Management', () => {
    test('cancels a subscription', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'cancel-customer',
        displayName: 'Cancel Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'cancel-product',
        displayName: 'Cancel Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'cancel-plan',
        displayName: 'Cancel Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'cancel-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.cancelSubscription(subscription.key);

      const retrieved = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(retrieved?.status).toBe('cancelled');
      expect(retrieved?.cancellationDate).toBeDefined();
    });

    test('expires a subscription', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'expire-customer',
        displayName: 'Expire Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'expire-product',
        displayName: 'Expire Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'expire-plan',
        displayName: 'Expire Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'expire-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.expireSubscription(subscription.key);

      const retrieved = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(retrieved?.status).toBe('expired');
    });

    test('throws error when cancelling already cancelled subscription', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'double-cancel-customer',
        displayName: 'Double Cancel Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'double-cancel-product',
        displayName: 'Double Cancel Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'double-cancel-plan',
        displayName: 'Double Cancel Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'double-cancel-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.cancelSubscription(subscription.key);

      await expect(
        subscrio.subscriptions.cancelSubscription(subscription.key)
      ).rejects.toThrow();
    });
  });

  describe('List & Filter Tests', () => {
    test('lists all subscriptions', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'list-sub-customer',
        displayName: 'List Sub Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'list-sub-product',
        displayName: 'List Sub Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'list-sub-plan',
        displayName: 'List Sub Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'list-subscription-1',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const subscriptions = await subscrio.subscriptions.listSubscriptions();
      expect(subscriptions.length).toBeGreaterThan(0);
    });

    test('filters subscriptions by customer key', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'filter-customer-unique',
        displayName: 'Filter Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'filter-customer-product',
        displayName: 'Filter Customer Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'filter-customer-plan',
        displayName: 'Filter Customer Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'filter-by-customer-sub',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const subscriptions = await subscrio.subscriptions.listSubscriptions({ 
        customerKey: customer.key 
      });
      expect(subscriptions.every(s => s.customerKey === customer.key)).toBe(true);
    });

    test('filters subscriptions by product key', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'filter-product-customer',
        displayName: 'Filter Product Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'filter-product-unique',
        displayName: 'Filter Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'filter-product-plan',
        displayName: 'Filter Product Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'filter-by-product-sub',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const subscriptions = await subscrio.subscriptions.listSubscriptions({ 
        productKey: product.key 
      });
      expect(subscriptions.every(s => s.productKey === product.key)).toBe(true);
    });

    test('filters subscriptions by plan key', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'filter-plan-customer',
        displayName: 'Filter Plan Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'filter-plan-product',
        displayName: 'Filter Plan Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'filter-plan-unique',
        displayName: 'Filter Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'filter-by-plan-sub',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const subscriptions = await subscrio.subscriptions.listSubscriptions({ 
        planKey: plan.key 
      });
      expect(subscriptions.every(s => s.planKey === plan.key)).toBe(true);
    });

    test('filters subscriptions by status (active)', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'filter-active-sub-customer',
        displayName: 'Filter Active Sub Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'filter-active-sub-product',
        displayName: 'Filter Active Sub Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'filter-active-sub-plan',
        displayName: 'Filter Active Sub Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'filter-active-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const subscriptions = await subscrio.subscriptions.listSubscriptions({ 
        status: 'active' 
      });
      expect(subscriptions.every(s => s.status === 'active')).toBe(true);
    });

    test('filters subscriptions by status (cancelled)', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'filter-cancelled-customer',
        displayName: 'Filter Cancelled Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'filter-cancelled-product',
        displayName: 'Filter Cancelled Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'filter-cancelled-plan',
        displayName: 'Filter Cancelled Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'filter-cancelled-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.cancelSubscription(subscription.key);

      const subscriptions = await subscrio.subscriptions.listSubscriptions({ 
        status: 'cancelled' 
      });
      expect(subscriptions.some(s => s.key === subscription.key)).toBe(true);
    });

    test('gets subscriptions by customer', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'get-by-customer-unique',
        displayName: 'Get By Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'get-by-customer-product',
        displayName: 'Get By Customer Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'get-by-customer-plan',
        displayName: 'Get By Customer Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'get-by-customer-sub',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const subscriptions = await subscrio.subscriptions.getSubscriptionsByCustomer(customer.key);
      expect(subscriptions.every(s => s.customerKey === customer.key)).toBe(true);
    });

    test('gets active subscriptions by customer', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'active-by-customer',
        displayName: 'Active By Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'active-by-customer-product',
        displayName: 'Active By Customer Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'active-by-customer-plan',
        displayName: 'Active By Customer Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      await subscrio.subscriptions.createSubscription({
        key: 'active-by-customer-sub',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      const subscriptions = await subscrio.subscriptions.getActiveSubscriptionsByCustomer(customer.key);
      expect(subscriptions.every(s => s.status === 'active')).toBe(true);
    });

    test('paginates subscription list', async () => {
      const subscriptions = await subscrio.subscriptions.listSubscriptions({ limit: 5 });
      expect(subscriptions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Feature Override Management', () => {
    test('adds feature override to subscription', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'override-customer',
        displayName: 'Override Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'override-product',
        displayName: 'Override Product'
      });

      const feature = await subscrio.features.createFeature({
        key: 'override-feature',
        displayName: 'Override Feature',
        valueType: 'numeric',
        defaultValue: '10'
      });

      await subscrio.products.associateFeature(product.key, feature.key);

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'override-plan',
        displayName: 'Override Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'override-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.addFeatureOverride(
        subscription.key,
        feature.key,
        '100',
        'permanent'
      );

      const value = await subscrio.featureChecker.getValue(customer.key, feature.key);
      expect(value).toBe('100');
    });

    test('adds permanent feature override', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'perm-override-customer',
        displayName: 'Perm Override Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'perm-override-product',
        displayName: 'Perm Override Product'
      });

      const feature = await subscrio.features.createFeature({
        key: 'perm-override-feature',
        displayName: 'Perm Override Feature',
        valueType: 'toggle',
        defaultValue: 'false'
      });

      await subscrio.products.associateFeature(product.key, feature.key);

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'perm-override-plan',
        displayName: 'Perm Override Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'perm-override-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.addFeatureOverride(
        subscription.key,
        feature.key,
        'true',
        'permanent'
      );

      const value = await subscrio.featureChecker.getValue(customer.key, feature.key);
      expect(value).toBe('true');
    });

    test('adds temporary feature override', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'temp-override-customer',
        displayName: 'Temp Override Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'temp-override-product',
        displayName: 'Temp Override Product'
      });

      const feature = await subscrio.features.createFeature({
        key: 'temp-override-feature',
        displayName: 'Temp Override Feature',
        valueType: 'numeric',
        defaultValue: '5'
      });

      await subscrio.products.associateFeature(product.key, feature.key);

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'temp-override-plan',
        displayName: 'Temp Override Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'temp-override-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.addFeatureOverride(
        subscription.key,
        feature.key,
        '20',
        'temporary'
      );

      const value = await subscrio.featureChecker.getValue(customer.key, feature.key);
      expect(value).toBe('20');
    });

    test('removes feature override', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'remove-override-customer',
        displayName: 'Remove Override Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'remove-override-product',
        displayName: 'Remove Override Product'
      });

      const feature = await subscrio.features.createFeature({
        key: 'remove-override-feature',
        displayName: 'Remove Override Feature',
        valueType: 'numeric',
        defaultValue: '10'
      });

      await subscrio.products.associateFeature(product.key, feature.key);

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'remove-override-plan',
        displayName: 'Remove Override Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'remove-override-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.addFeatureOverride(
        subscription.key,
        feature.key,
        '50',
        'permanent'
      );

      await subscrio.subscriptions.removeFeatureOverride(subscription.key, feature.key);

      const value = await subscrio.featureChecker.getValue(customer.key, feature.key);
      expect(value).toBe('10'); // Falls back to default
    });

    test('clears temporary overrides only', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'clear-temp-customer',
        displayName: 'Clear Temp Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'clear-temp-product',
        displayName: 'Clear Temp Product'
      });

      const feature = await subscrio.features.createFeature({
        key: 'clear-temp-feature',
        displayName: 'Clear Temp Feature',
        valueType: 'numeric',
        defaultValue: '10'
      });

      await subscrio.products.associateFeature(product.key, feature.key);

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'clear-temp-plan',
        displayName: 'Clear Temp Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'clear-temp-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.addFeatureOverride(
        subscription.key,
        feature.key,
        '100',
        'temporary'
      );

      await subscrio.subscriptions.clearTemporaryOverrides(subscription.key);

      const value = await subscrio.featureChecker.getValue(customer.key, feature.key);
      expect(value).toBe('10'); // Falls back to default
    });

    test('preserves permanent overrides when clearing temporary', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'preserve-perm-customer',
        displayName: 'Preserve Perm Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'preserve-perm-product',
        displayName: 'Preserve Perm Product'
      });

      const feature1 = await subscrio.features.createFeature({
        key: 'preserve-perm-feature-1',
        displayName: 'Preserve Perm Feature 1',
        valueType: 'numeric',
        defaultValue: '10'
      });

      const feature2 = await subscrio.features.createFeature({
        key: 'preserve-perm-feature-2',
        displayName: 'Preserve Perm Feature 2',
        valueType: 'numeric',
        defaultValue: '20'
      });

      await subscrio.products.associateFeature(product.key, feature1.key);
      await subscrio.products.associateFeature(product.key, feature2.key);

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'preserve-perm-plan',
        displayName: 'Preserve Perm Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'preserve-perm-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await subscrio.subscriptions.addFeatureOverride(
        subscription.key,
        feature1.key,
        '100',
        'permanent'
      );

      await subscrio.subscriptions.addFeatureOverride(
        subscription.key,
        feature2.key,
        '200',
        'temporary'
      );

      await subscrio.subscriptions.clearTemporaryOverrides(subscription.key);

      const value1 = await subscrio.featureChecker.getValue(customer.key, feature1.key);
      const value2 = await subscrio.featureChecker.getValue(customer.key, feature2.key);

      expect(value1).toBe('100'); // Permanent preserved
      expect(value2).toBe('20');  // Temporary cleared, falls back to default
    });

    test('throws error when overriding non-existent feature', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'error-override-customer',
        displayName: 'Error Override Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'error-override-product',
        displayName: 'Error Override Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'error-override-plan',
        displayName: 'Error Override Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'error-override-subscription',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      await expect(
        subscrio.subscriptions.addFeatureOverride(
          subscription.key,
          'non-existent-feature',
          '100',
          'permanent'
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('Relationship Tests', () => {
    test('deletes subscription', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'delete-sub-customer',
        displayName: 'Delete Sub Customer'
      });

      const product = await subscrio.products.createProduct({
        key: 'delete-sub-product',
        displayName: 'Delete Sub Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'delete-sub-plan',
        displayName: 'Delete Sub Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        productKey: product.key,
        planKey: plan.key,
        key: 'test-monthly',
        displayName: 'Test Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        key: 'delete-subscription-test',
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key
      });

      // Must expire before deletion
      await subscrio.subscriptions.expireSubscription(subscription.key);
      await subscrio.subscriptions.deleteSubscription(subscription.key);

      const retrieved = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(retrieved).toBeNull();
    });
  });
});

