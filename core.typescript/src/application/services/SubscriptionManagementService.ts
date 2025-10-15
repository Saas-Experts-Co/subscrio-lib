import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository.js';
import { ICustomerRepository } from '../repositories/ICustomerRepository.js';
import { IPlanRepository } from '../repositories/IPlanRepository.js';
import { IBillingCycleRepository } from '../repositories/IBillingCycleRepository.js';
import { IFeatureRepository } from '../repositories/IFeatureRepository.js';
import { IProductRepository } from '../repositories/IProductRepository.js';
import { 
  CreateSubscriptionDto, 
  CreateSubscriptionDtoSchema, 
  UpdateSubscriptionDto, 
  UpdateSubscriptionDtoSchema,
  SubscriptionFilterDto,
  SubscriptionFilterDtoSchema,
  SubscriptionDto 
} from '../dtos/SubscriptionDto.js';
import { SubscriptionMapper } from '../mappers/SubscriptionMapper.js';
import { Subscription } from '../../domain/entities/Subscription.js';
import { SubscriptionStatus, OverrideType } from '../../domain/value-objects/index.js';
import { generateId } from '../../infrastructure/utils/uuid.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  DomainError 
} from '../errors/index.js';

export class SubscriptionManagementService {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly planRepository: IPlanRepository,
    private readonly billingCycleRepository: IBillingCycleRepository,
    private readonly featureRepository: IFeatureRepository,
    private readonly productRepository: IProductRepository
  ) {}

  private async resolveSubscriptionKeys(subscription: Subscription): Promise<{
    customerKey: string;
    productKey: string;
    planKey: string;
    billingCycleKey: string;
  }> {
    // Get customer
    const customer = await this.customerRepository.findById(subscription.customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with id '${subscription.customerId}' not found`);
    }

    // Get plan
    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundError(`Plan with id '${subscription.planId}' not found`);
    }

    // Get billing cycle (required)
    const cycle = await this.billingCycleRepository.findById(subscription.props.billingCycleId);
    if (!cycle) {
      throw new NotFoundError(`Billing cycle with id '${subscription.props.billingCycleId}' not found`);
    }

    return {
      customerKey: customer.key,
      productKey: plan.productKey,
      planKey: plan.key,
      billingCycleKey: cycle.key
    };
  }

  async createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionDto> {
    const validationResult = CreateSubscriptionDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid subscription data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    // Verify customer exists
    const customer = await this.customerRepository.findByExternalId(validatedDto.customerKey);
    if (!customer) {
      throw new NotFoundError(`Customer with key '${validatedDto.customerKey}' not found`);
    }

    // Verify product exists
    const product = await this.productRepository.findByKey(validatedDto.productKey);
    if (!product) {
      throw new NotFoundError(`Product with key '${validatedDto.productKey}' not found`);
    }

    // Verify plan exists
    const plan = await this.planRepository.findByKey(product.key, validatedDto.planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${validatedDto.planKey}' not found for product '${validatedDto.productKey}'`);
    }

    // Verify billing cycle exists (required)
    const billingCycle = await this.billingCycleRepository.findByKey(validatedDto.billingCycleKey, plan.id);
    if (!billingCycle) {
      throw new NotFoundError(`Billing cycle with key '${validatedDto.billingCycleKey}' not found for plan '${validatedDto.planKey}'`);
    }
    const billingCycleId = billingCycle.id;

    // Check for duplicate subscription key
    const existingKey = await this.subscriptionRepository.findByKey(validatedDto.key);
    if (existingKey) {
      throw new ConflictError(`Subscription with key '${validatedDto.key}' already exists`);
    }

    // Check for duplicate Stripe subscription ID if provided
    if (validatedDto.stripeSubscriptionId) {
      const existing = await this.subscriptionRepository.findByStripeId(validatedDto.stripeSubscriptionId);
      if (existing) {
        throw new ConflictError(`Subscription with Stripe ID '${validatedDto.stripeSubscriptionId}' already exists`);
      }
    }

    const id = generateId();
    
    // Determine initial status
    const trialEndDate = validatedDto.trialEndDate ? new Date(validatedDto.trialEndDate) : undefined;
    const initialStatus = (trialEndDate && new Date() < trialEndDate) 
      ? SubscriptionStatus.Trial 
      : SubscriptionStatus.Active;

    const subscription = new Subscription({
      key: validatedDto.key,  // User-supplied key
      customerId: customer.id,
      planId: plan.id,
      billingCycleId,
      status: initialStatus,
      activationDate: validatedDto.activationDate ? new Date(validatedDto.activationDate) : new Date(),
      expirationDate: validatedDto.expirationDate ? new Date(validatedDto.expirationDate) : undefined,
      cancellationDate: validatedDto.cancellationDate ? new Date(validatedDto.cancellationDate) : undefined,
      trialEndDate,
      currentPeriodStart: validatedDto.currentPeriodStart ? new Date(validatedDto.currentPeriodStart) : new Date(),
      currentPeriodEnd: validatedDto.currentPeriodEnd ? new Date(validatedDto.currentPeriodEnd) : undefined,
      autoRenew: validatedDto.autoRenew ?? true,
      stripeSubscriptionId: validatedDto.stripeSubscriptionId,
      featureOverrides: [],
      metadata: validatedDto.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }, id);

    await this.subscriptionRepository.save(subscription);

    const keys = await this.resolveSubscriptionKeys(subscription);
    return SubscriptionMapper.toDto(
      subscription,
      keys.customerKey,
      keys.productKey,
      keys.planKey,
      keys.billingCycleKey
    );
  }

  async updateSubscription(subscriptionKey: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDto> {
    const validationResult = UpdateSubscriptionDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid update data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    // Update properties
    if (validatedDto.activationDate !== undefined) {
      subscription.props.activationDate = validatedDto.activationDate ? new Date(validatedDto.activationDate) : undefined;
    }
    if (validatedDto.expirationDate !== undefined) {
      subscription.props.expirationDate = validatedDto.expirationDate ? new Date(validatedDto.expirationDate) : undefined;
    }
    if (validatedDto.cancellationDate !== undefined) {
      subscription.props.cancellationDate = validatedDto.cancellationDate ? new Date(validatedDto.cancellationDate) : undefined;
    }
    if (validatedDto.trialEndDate !== undefined) {
      subscription.props.trialEndDate = validatedDto.trialEndDate ? new Date(validatedDto.trialEndDate) : undefined;
    }
    if (validatedDto.currentPeriodStart !== undefined) {
      subscription.props.currentPeriodStart = validatedDto.currentPeriodStart ? new Date(validatedDto.currentPeriodStart) : undefined;
    }
    if (validatedDto.currentPeriodEnd !== undefined) {
      subscription.props.currentPeriodEnd = validatedDto.currentPeriodEnd ? new Date(validatedDto.currentPeriodEnd) : undefined;
    }
    if (validatedDto.autoRenew !== undefined) {
      subscription.props.autoRenew = validatedDto.autoRenew;
    }
    if (validatedDto.metadata !== undefined) {
      subscription.props.metadata = validatedDto.metadata;
    }

    subscription.props.updatedAt = new Date();
    await this.subscriptionRepository.save(subscription);
    
    const keys = await this.resolveSubscriptionKeys(subscription);
    return SubscriptionMapper.toDto(subscription, keys.customerKey, keys.productKey, keys.planKey, keys.billingCycleKey);
  }

  async getSubscription(subscriptionKey: string): Promise<SubscriptionDto | null> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) return null;
    
    const keys = await this.resolveSubscriptionKeys(subscription);
    return SubscriptionMapper.toDto(subscription, keys.customerKey, keys.productKey, keys.planKey, keys.billingCycleKey);
  }

  async getSubscriptionByStripeId(stripeId: string): Promise<SubscriptionDto | null> {
    const subscription = await this.subscriptionRepository.findByStripeId(stripeId);
    if (!subscription) return null;
    
    const keys = await this.resolveSubscriptionKeys(subscription);
    return SubscriptionMapper.toDto(subscription, keys.customerKey, keys.productKey, keys.planKey, keys.billingCycleKey);
  }

  async listSubscriptions(filters?: SubscriptionFilterDto): Promise<SubscriptionDto[]> {
    const validationResult = SubscriptionFilterDtoSchema.safeParse(filters || {});
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid filter parameters',
        validationResult.error.errors
      );
    }

    let subscriptions = await this.subscriptionRepository.findAll(validationResult.data);
    
    // Apply key-based filters (post-fetch filtering)
    if (filters?.customerKey) {
      const customer = await this.customerRepository.findByExternalId(filters.customerKey);
      if (customer) {
        subscriptions = subscriptions.filter(s => s.customerId === customer.id);
      } else {
        subscriptions = [];
      }
    }

    if (filters?.productKey) {
      const product = await this.productRepository.findByKey(filters.productKey);
      if (product) {
        const validPlanIds = new Set<string>();
        const plans = await this.planRepository.findByProduct(product.key);
        plans.forEach(p => validPlanIds.add(p.id));
        subscriptions = subscriptions.filter(s => validPlanIds.has(s.planId));
      } else {
        subscriptions = [];
      }
    }

    if (filters?.planKey) {
      if (filters?.productKey) {
        const plan = await this.planRepository.findByKey(filters.productKey, filters.planKey);
        if (plan) {
          subscriptions = subscriptions.filter(s => s.planId === plan.id);
        } else {
          subscriptions = [];
        }
      } else {
        // Filter by planKey alone - need to find all plans with this key across all products
        const allPlans = await this.planRepository.findAll({ limit: 1000, offset: 0 });
        const matchingPlanIds = new Set(
          allPlans.filter(p => p.key === filters.planKey).map(p => p.id)
        );
        subscriptions = subscriptions.filter(s => matchingPlanIds.has(s.planId));
      }
    }
    
    const dtos: SubscriptionDto[] = [];
    for (const subscription of subscriptions) {
      const keys = await this.resolveSubscriptionKeys(subscription);
      dtos.push(SubscriptionMapper.toDto(subscription, keys.customerKey, keys.productKey, keys.planKey, keys.billingCycleKey));
    }
    return dtos;
  }

  async getSubscriptionsByCustomer(customerKey: string): Promise<SubscriptionDto[]> {
    const customer = await this.customerRepository.findByExternalId(customerKey);
    if (!customer) {
      throw new NotFoundError(`Customer with key '${customerKey}' not found`);
    }

    const subscriptions = await this.subscriptionRepository.findByCustomerId(customer.id);
    
    const dtos: SubscriptionDto[] = [];
    for (const subscription of subscriptions) {
      const keys = await this.resolveSubscriptionKeys(subscription);
      dtos.push(SubscriptionMapper.toDto(subscription, keys.customerKey, keys.productKey, keys.planKey, keys.billingCycleKey));
    }
    return dtos;
  }

  async getActiveSubscriptionsByCustomer(customerKey: string): Promise<SubscriptionDto[]> {
    const customer = await this.customerRepository.findByExternalId(customerKey);
    if (!customer) {
      throw new NotFoundError(`Customer with key '${customerKey}' not found`);
    }

    const subscriptions = await this.subscriptionRepository.findByCustomerId(customer.id, {
      status: SubscriptionStatus.Active,
      limit: 100,
      offset: 0
    });
    
    const dtos: SubscriptionDto[] = [];
    for (const subscription of subscriptions) {
      const keys = await this.resolveSubscriptionKeys(subscription);
      dtos.push(SubscriptionMapper.toDto(subscription, keys.customerKey, keys.productKey, keys.planKey, keys.billingCycleKey));
    }
    return dtos;
  }

  async cancelSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    subscription.cancel();
    await this.subscriptionRepository.save(subscription);
  }

  async expireSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    subscription.expire();
    await this.subscriptionRepository.save(subscription);
  }

  async renewSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    subscription.renew();
    await this.subscriptionRepository.save(subscription);
  }

  async deleteSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    if (!subscription.canDelete()) {
      throw new DomainError(
        `Cannot delete subscription with status '${subscription.status}'. ` +
        'Subscription must be expired before deletion.'
      );
    }

    await this.subscriptionRepository.delete(subscription.id);
  }

  async addFeatureOverride(
    subscriptionKey: string, 
    featureKey: string, 
    value: string, 
    overrideType: OverrideType = OverrideType.Permanent
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    // Validate value against feature type
    this.validateFeatureValue(value, feature.props.valueType);

    subscription.addFeatureOverride(feature.id, value, overrideType);
    await this.subscriptionRepository.save(subscription);
  }

  async removeFeatureOverride(subscriptionKey: string, featureKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    subscription.removeFeatureOverride(feature.id);
    await this.subscriptionRepository.save(subscription);
  }

  async clearTemporaryOverrides(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    subscription.clearTemporaryOverrides();
    await this.subscriptionRepository.save(subscription);
  }

  private validateFeatureValue(value: string, valueType: string): void {
    switch (valueType) {
      case 'toggle':
        if (!['true', 'false'].includes(value.toLowerCase())) {
          throw new ValidationError('Toggle features must have value "true" or "false"');
        }
        break;
      case 'numeric':
        const num = Number(value);
        if (isNaN(num) || !isFinite(num)) {
          throw new ValidationError('Numeric features must have a valid number value');
        }
        break;
      case 'text':
        // Text features accept any string value
        break;
      default:
        throw new ValidationError(`Unknown feature value type: ${valueType}`);
    }
  }
}
