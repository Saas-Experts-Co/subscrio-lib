import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Subscrio } from '@subscrio/core';
import { setupTestDatabase, teardownTestDatabase } from '../setup/database';

describe('Entity Lifecycle Management Tests', () => {
  let subscrio: Subscrio;
  let dbName: string;
  
  beforeAll(async () => {
    const context = await setupTestDatabase();
    subscrio = context.subscrio;
    dbName = context.dbName;
  });
  
  afterAll(async () => {
    await teardownTestDatabase(dbName);
  });

  describe('Product Lifecycle', () => {
    test('complete product lifecycle', async () => {
      // Create product
      const product = await subscrio.products.createProduct({
        key: 'lifecycle-test-product',
        displayName: 'Lifecycle Test Product'
      });
      expect(product.status).toBe('active');

      // Archive product
      const archived = await subscrio.products.archiveProduct(product.key);
      expect(archived.status).toBe('archived');

      // Unarchive product
      const unarchived = await subscrio.products.unarchiveProduct(product.key);
      expect(unarchived.status).toBe('active');

      // Archive again for deletion
      await subscrio.products.archiveProduct(product.key);

      // Delete product (should work when archived)
      await subscrio.products.deleteProduct(product.key);

      // Verify deletion
      const deleted = await subscrio.products.getProduct(product.key);
      expect(deleted).toBeNull();
    });

    test('cannot delete non-archived product', async () => {
      const product = await subscrio.products.createProduct({
        key: 'non-archived-product',
        displayName: 'Non-Archived Product'
      });

      await expect(
        subscrio.products.deleteProduct(product.key)
      ).rejects.toThrow('must be archived before deletion');
    });
  });

  describe('Plan Lifecycle', () => {
    test('complete plan lifecycle', async () => {
      // Create product first
      const product = await subscrio.products.createProduct({
        key: 'plan-lifecycle-product',
        displayName: 'Plan Lifecycle Product'
      });

      // Create plan
      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'lifecycle-test-plan',
        displayName: 'Lifecycle Test Plan'
      });
      expect(plan.status).toBe('active');

      // Archive plan
      await subscrio.plans.archivePlan(plan.key);
      const archived = await subscrio.plans.getPlan(plan.key);
      expect(archived?.status).toBe('archived');

      // Unarchive plan
      await subscrio.plans.unarchivePlan(plan.key);
      const unarchived = await subscrio.plans.getPlan(plan.key);
      expect(unarchived?.status).toBe('active');

      // Archive again for deletion
      await subscrio.plans.archivePlan(plan.key);

      // Delete plan (should work when archived)
      await subscrio.plans.deletePlan(plan.key);

      // Verify deletion
      const deleted = await subscrio.plans.getPlan(plan.key);
      expect(deleted).toBeNull();
    });

    test('cannot delete non-archived plan', async () => {
      const product = await subscrio.products.createProduct({
        key: 'plan-delete-test-product',
        displayName: 'Plan Delete Test Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'non-archived-plan',
        displayName: 'Non-Archived Plan'
      });

      await expect(
        subscrio.plans.deletePlan(plan.key)
      ).rejects.toThrow('must be archived before deletion');
    });
  });

  describe('Feature Lifecycle', () => {
    test('complete feature lifecycle', async () => {
      // Create feature
      const feature = await subscrio.features.createFeature({
        key: 'lifecycle-test-feature',
        displayName: 'Lifecycle Test Feature',
        valueType: 'toggle',
        defaultValue: 'false'
      });
      expect(feature.status).toBe('active');

      // Archive feature
      await subscrio.features.archiveFeature(feature.key);
      const archived = await subscrio.features.getFeature(feature.key);
      expect(archived?.status).toBe('archived');

      // Unarchive feature
      await subscrio.features.unarchiveFeature(feature.key);
      const unarchived = await subscrio.features.getFeature(feature.key);
      expect(unarchived?.status).toBe('active');

      // Archive again for deletion
      await subscrio.features.archiveFeature(feature.key);

      // Delete feature (should work when archived)
      await subscrio.features.deleteFeature(feature.key);

      // Verify deletion
      const deleted = await subscrio.features.getFeature(feature.key);
      expect(deleted).toBeNull();
    });

    test('cannot delete non-archived feature', async () => {
      const feature = await subscrio.features.createFeature({
        key: 'non-archived-feature',
        displayName: 'Non-Archived Feature',
        valueType: 'toggle',
        defaultValue: 'false'
      });

      await expect(
        subscrio.features.deleteFeature(feature.key)
      ).rejects.toThrow('must be archived before deletion');
    });
  });

  describe('Customer Lifecycle', () => {
    test('complete customer lifecycle', async () => {
      // Create customer
      const customer = await subscrio.customers.createCustomer({
        key: 'lifecycle-test-customer',
        displayName: 'Lifecycle Test Customer'
      });
      expect(customer.status).toBe('active');

      // Archive customer
      await subscrio.customers.archiveCustomer(customer.key);
      const archived = await subscrio.customers.getCustomer(customer.key);
      expect(archived?.status).toBe('deleted');

      // Unarchive customer
      await subscrio.customers.unarchiveCustomer(customer.key);
      const unarchived = await subscrio.customers.getCustomer(customer.key);
      expect(unarchived?.status).toBe('active');

      // Archive again for deletion
      await subscrio.customers.archiveCustomer(customer.key);

      // Delete customer (should work when archived)
      await subscrio.customers.deleteCustomer(customer.key);

      // Verify deletion
      const deleted = await subscrio.customers.getCustomer(customer.key);
      expect(deleted).toBeNull();
    });

    test('cannot delete non-archived customer', async () => {
      const customer = await subscrio.customers.createCustomer({
        key: 'non-archived-customer',
        displayName: 'Non-Archived Customer'
      });

      await expect(
        subscrio.customers.deleteCustomer(customer.key)
      ).rejects.toThrow('must be marked as deleted before permanent deletion');
    });
  });

  describe('Subscription Lifecycle', () => {
    test('complete subscription lifecycle', async () => {
      // Create product and plan
      const product = await subscrio.products.createProduct({
        key: 'subscription-lifecycle-product',
        displayName: 'Subscription Lifecycle Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'subscription-lifecycle-plan',
        displayName: 'Subscription Lifecycle Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: 'subscription-lifecycle-cycle',
        displayName: 'Subscription Lifecycle Cycle',
        durationValue: 1,
        durationUnit: 'months'
      });

      const customer = await subscrio.customers.createCustomer({
        key: 'subscription-lifecycle-customer',
        displayName: 'Subscription Lifecycle Customer'
      });

      // Create subscription
      const subscription = await subscrio.subscriptions.createSubscription({
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key,
        key: 'lifecycle-test-subscription'
      });
      expect(subscription.status).toBe('active');

      // Archive subscription
      await subscrio.subscriptions.archiveSubscription(subscription.key);
      const archived = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(archived?.status).toBe('expired');

      // Unarchive subscription
      await subscrio.subscriptions.unarchiveSubscription(subscription.key);
      const unarchived = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(unarchived?.status).toBe('active');

      // Archive again for deletion
      await subscrio.subscriptions.archiveSubscription(subscription.key);

      // Delete subscription (should work when archived)
      await subscrio.subscriptions.deleteSubscription(subscription.key);

      // Verify deletion
      const deleted = await subscrio.subscriptions.getSubscription(subscription.key);
      expect(deleted).toBeNull();
    });

    test('cannot delete non-archived subscription', async () => {
      const product = await subscrio.products.createProduct({
        key: 'subscription-delete-test-product',
        displayName: 'Subscription Delete Test Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'subscription-delete-test-plan',
        displayName: 'Subscription Delete Test Plan'
      });

      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: 'subscription-delete-test-cycle',
        displayName: 'Subscription Delete Test Cycle',
        durationValue: 1,
        durationUnit: 'months'
      });

      const customer = await subscrio.customers.createCustomer({
        key: 'subscription-delete-test-customer',
        displayName: 'Subscription Delete Test Customer'
      });

      const subscription = await subscrio.subscriptions.createSubscription({
        customerKey: customer.key,
        productKey: product.key,
        planKey: plan.key,
        billingCycleKey: billingCycle.key,
        key: 'non-archived-subscription'
      });

      await expect(
        subscrio.subscriptions.deleteSubscription(subscription.key)
      ).rejects.toThrow('must be expired before deletion');
    });
  });

  describe('API Key Lifecycle', () => {
    test('complete API key lifecycle', async () => {
      // Create API key
      const apiKey = await subscrio.apiKeys.createAPIKey({
        key: 'lifecycle-test-api-key',
        displayName: 'Lifecycle Test API Key',
        scope: 'readonly'
      });

      // Archive API key
      await subscrio.apiKeys.archiveAPIKey(apiKey.key);

      // Unarchive API key
      await subscrio.apiKeys.unarchiveAPIKey(apiKey.key);

      // Archive again for deletion
      await subscrio.apiKeys.archiveAPIKey(apiKey.key);

      // Delete API key (should work when archived)
      await subscrio.apiKeys.deleteAPIKey(apiKey.key);

      // Verify deletion (API keys don't have get methods for security)
      // This test verifies the method exists and doesn't throw
    });

    test('cannot delete non-archived API key', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        key: 'non-archived-api-key',
        displayName: 'Non-Archived API Key',
        scope: 'readonly'
      });

      await expect(
        subscrio.apiKeys.deleteAPIKey(apiKey.key)
      ).rejects.toThrow('must be revoked before deletion');
    });
  });

  describe('Billing Cycle Lifecycle', () => {
    test('complete billing cycle lifecycle', async () => {
      const product = await subscrio.products.createProduct({
        key: 'billing-cycle-lifecycle-product',
        displayName: 'Billing Cycle Lifecycle Product'
      });

      const plan = await subscrio.plans.createPlan({
        productKey: product.key,
        key: 'billing-cycle-lifecycle-plan',
        displayName: 'Billing Cycle Lifecycle Plan'
      });

      // Create billing cycle
      const billingCycle = await subscrio.billingCycles.createBillingCycle({
        planKey: plan.key,
        key: 'lifecycle-test-billing-cycle',
        displayName: 'Lifecycle Test Billing Cycle',
        durationValue: 1,
        durationUnit: 'months'
      });

      // Archive billing cycle
      await subscrio.billingCycles.archiveBillingCycle(billingCycle.key);

      // Unarchive billing cycle
      await subscrio.billingCycles.unarchiveBillingCycle(billingCycle.key);

      // Archive again for deletion
      await subscrio.billingCycles.archiveBillingCycle(billingCycle.key);

      // Delete billing cycle (should work when archived)
      await subscrio.billingCycles.deleteBillingCycle(billingCycle.key);

      // Verify deletion
      const deleted = await subscrio.billingCycles.getBillingCycle(billingCycle.key);
      expect(deleted).toBeNull();
    });
  });
});
