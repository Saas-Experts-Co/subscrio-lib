import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository.js';
import { IPlanRepository } from '../repositories/IPlanRepository.js';
import { IFeatureRepository } from '../repositories/IFeatureRepository.js';
import { ICustomerRepository } from '../repositories/ICustomerRepository.js';
import { IProductRepository } from '../repositories/IProductRepository.js';
import { FeatureValueResolver } from '../../domain/services/FeatureValueResolver.js';
import { SubscriptionStatus } from '../../domain/value-objects/index.js';
import { NotFoundError } from '../errors/index.js';

export class FeatureCheckerService {
  private readonly resolver: FeatureValueResolver;

  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
    private readonly featureRepository: IFeatureRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly productRepository: IProductRepository
  ) {
    this.resolver = new FeatureValueResolver();
  }

  /**
   * Check if a feature is enabled for a customer
   */
  async isEnabled(
    customerExternalId: string,
    featureKey: string
  ): Promise<boolean> {
    const value = await this.getValue(customerExternalId, featureKey);
    
    // Toggle features: check if value is 'true'
    return value?.toLowerCase() === 'true';
  }

  /**
   * Get feature value for a customer
   */
  async getValue<T = string>(
    customerExternalId: string,
    featureKey: string,
    defaultValue?: T
  ): Promise<T | null> {
    // Find customer
    const customer = await this.customerRepository.findByExternalId(customerExternalId);
    if (!customer) {
      return defaultValue ?? null;
    }

    // Get feature
    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      return defaultValue ?? null;
    }

    // Get all active subscriptions for customer
    const subscriptions = await this.subscriptionRepository.findByCustomerId(
      customer.id,
      { status: SubscriptionStatus.Active, limit: 100, offset: 0 }
    );

    if (subscriptions.length === 0) {
      // No active subscriptions, return default
      return (feature.defaultValue as T) ?? defaultValue ?? null;
    }

    // Get plans for subscriptions
    const planIds = subscriptions.map(s => s.planId);
    const plans = await this.planRepository.findByIds(planIds);
    const planMap = new Map(plans.map(p => [p.id, p]));

    // Resolve using hierarchy
    let resolvedValue: string | null = null;

    for (const subscription of subscriptions) {
      const plan = planMap.get(subscription.planId);
      const value = this.resolver.resolve(feature, plan ?? null, subscription);
      
      // If this subscription has an override, use it immediately
      if (subscription.getFeatureOverride(feature.id)) {
        resolvedValue = value;
        break;
      }
      
      // Otherwise keep checking
      if (!resolvedValue) {
        resolvedValue = value;
      }
    }

    return (resolvedValue as T) ?? defaultValue ?? null;
  }

  /**
   * Get all feature values for a customer
   */
  async getAllFeatures(
    customerExternalId: string
  ): Promise<Map<string, string>> {
    const customer = await this.customerRepository.findByExternalId(customerExternalId);
    if (!customer) {
      return new Map();
    }

    // Get all features
    const features = await this.featureRepository.findAll();

    // Get all active subscriptions
    const subscriptions = await this.subscriptionRepository.findByCustomerId(
      customer.id,
      { status: SubscriptionStatus.Active, limit: 100, offset: 0 }
    );

    // Get plans
    const planIds = subscriptions.map(s => s.planId);
    const plans = await this.planRepository.findByIds(planIds);
    const planMap = new Map(plans.map(p => [p.id, p]));

    // Resolve all features
    return this.resolver.resolveAll(features, planMap, subscriptions);
  }

  /**
   * Get feature values for a specific subscription
   */
  async getFeaturesForSubscription(
    subscriptionId: string
  ): Promise<Map<string, string>> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError(`Subscription with id '${subscriptionId}' not found`);
    }

    // Get plan
    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundError(`Plan with id '${subscription.planId}' not found`);
    }

    // Get product to find features
    const product = await this.productRepository.findByKey(plan.productKey);
    if (!product) {
      throw new NotFoundError(`Product with key '${plan.productKey}' not found`);
    }

    // Get all features for the product
    const features = await this.featureRepository.findByProduct(product.id);

    // Resolve features for this specific subscription
    const resolved = new Map<string, string>();
    
    for (const feature of features) {
      const value = this.resolver.resolve(feature, plan, subscription);
      resolved.set(feature.key, value);
    }

    return resolved;
  }

  /**
   * Check if customer has access to a specific plan
   */
  async hasPlanAccess(
    customerExternalId: string,
    productKey: string,
    planKey: string
  ): Promise<boolean> {
    const customer = await this.customerRepository.findByExternalId(customerExternalId);
    if (!customer) {
      return false;
    }

    const product = await this.productRepository.findByKey(productKey);
    if (!product) {
      return false;
    }

    const plan = await this.planRepository.findByKey(productKey, planKey);
    if (!plan) {
      return false;
    }

    const subscriptions = await this.subscriptionRepository.findByCustomerId(
      customer.id,
      { status: SubscriptionStatus.Active, limit: 100, offset: 0 }
    );

    return subscriptions.some(s => s.planId === plan.id);
  }

  /**
   * Get all active plans for a customer
   */
  async getActivePlans(customerExternalId: string): Promise<string[]> {
    const customer = await this.customerRepository.findByExternalId(customerExternalId);
    if (!customer) {
      return [];
    }

    const subscriptions = await this.subscriptionRepository.findByCustomerId(
      customer.id,
      { status: SubscriptionStatus.Active, limit: 100, offset: 0 }
    );

    // Load plan keys for each subscription
    const planKeys = [];
    for (const subscription of subscriptions) {
      const plan = await this.planRepository.findById(subscription.planId);
      if (plan) {
        planKeys.push(plan.key);
      }
    }
    return planKeys;
  }

  /**
   * Get feature usage summary for a customer
   */
  async getFeatureUsageSummary(customerExternalId: string): Promise<{
    activeSubscriptions: number;
    enabledFeatures: string[];
    disabledFeatures: string[];
    numericFeatures: Map<string, number>;
    textFeatures: Map<string, string>;
  }> {
    const customer = await this.customerRepository.findByExternalId(customerExternalId);
    const activeSubscriptions = customer 
      ? (await this.subscriptionRepository.findByCustomerId(customer.id, { status: SubscriptionStatus.Active, limit: 100, offset: 0 })).length
      : 0;

    const allFeatures = await this.getAllFeatures(customerExternalId);
    
    const enabledFeatures: string[] = [];
    const disabledFeatures: string[] = [];
    const numericFeatures = new Map<string, number>();
    const textFeatures = new Map<string, string>();

    // Get all features to determine their types
    const features = await this.featureRepository.findAll();
    const featureTypeMap = new Map(features.map(f => [f.key, f.valueType]));

    for (const [featureKey, value] of allFeatures) {
      const valueType = featureTypeMap.get(featureKey);
      
      switch (valueType) {
        case 'toggle':
          if (value.toLowerCase() === 'true') {
            enabledFeatures.push(featureKey);
          } else {
            disabledFeatures.push(featureKey);
          }
          break;
        case 'numeric':
          const num = Number(value);
          if (!isNaN(num) && isFinite(num)) {
            numericFeatures.set(featureKey, num);
          }
          break;
        case 'text':
          textFeatures.set(featureKey, value);
          break;
      }
    }

    return {
      activeSubscriptions,
      enabledFeatures,
      disabledFeatures,
      numericFeatures,
      textFeatures
    };
  }
}
