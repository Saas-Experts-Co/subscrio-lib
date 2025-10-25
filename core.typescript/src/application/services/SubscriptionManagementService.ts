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
  DetailedSubscriptionFilterDto,
  DetailedSubscriptionFilterDtoSchema,
  SubscriptionDto 
} from '../dtos/SubscriptionDto.js';
import { SubscriptionMapper } from '../mappers/SubscriptionMapper.js';
import { Subscription } from '../../domain/entities/Subscription.js';
import { SubscriptionStatus } from '../../domain/value-objects/SubscriptionStatus.js';
import { OverrideType } from '../../domain/value-objects/OverrideType.js';
import { generateId } from '../../infrastructure/utils/uuid.js';
import { now } from '../../infrastructure/utils/date.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  DomainError 
} from '../errors/index.js';
import { FeatureValueValidator } from '../utils/FeatureValueValidator.js';

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
    const customer = await this.customerRepository.findByKey(validatedDto.customerKey);
    if (!customer) {
      throw new NotFoundError(`Customer with key '${validatedDto.customerKey}' not found`);
    }

    // Get billing cycle and derive plan/product from it
    const billingCycle = await this.billingCycleRepository.findByKey(validatedDto.billingCycleKey);
    if (!billingCycle) {
      throw new NotFoundError(`Billing cycle with key '${validatedDto.billingCycleKey}' not found`);
    }

    // Get plan from billing cycle
    const plan = await this.planRepository.findById(billingCycle.props.planId);
    if (!plan) {
      throw new NotFoundError(`Plan not found for billing cycle '${validatedDto.billingCycleKey}'`);
    }

    // Get product from plan
    const product = await this.productRepository.findByKey(plan.productKey);
    if (!product) {
      throw new NotFoundError(`Product not found for plan '${plan.key}'`);
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
    const trialEndDate = validatedDto.trialEndDate ? new Date(validatedDto.trialEndDate) : undefined;
    
    // Calculate currentPeriodEnd based on billing cycle duration
    const currentPeriodStart = validatedDto.currentPeriodStart ? new Date(validatedDto.currentPeriodStart) : now();
    const currentPeriodEnd = validatedDto.currentPeriodEnd 
      ? new Date(validatedDto.currentPeriodEnd) 
      : this.calculatePeriodEnd(currentPeriodStart, billingCycle);
    
    
    const subscription = new Subscription({
      key: validatedDto.key,  // User-supplied key
      customerId: customer.id,
      planId: plan.id,
      billingCycleId,
      status: SubscriptionStatus.Active,  // Default status, will be calculated dynamically
      activationDate: validatedDto.activationDate ? new Date(validatedDto.activationDate) : now(),
      expirationDate: validatedDto.expirationDate ? new Date(validatedDto.expirationDate) : undefined,
      cancellationDate: validatedDto.cancellationDate ? new Date(validatedDto.cancellationDate) : undefined,
      trialEndDate,
      currentPeriodStart,
      currentPeriodEnd,
      stripeSubscriptionId: validatedDto.stripeSubscriptionId,
      featureOverrides: [],
      metadata: validatedDto.metadata,
      createdAt: now(),
      updatedAt: now()
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
    
    // Check if trialEndDate was explicitly set to null/undefined in original input
    const wasTrialEndDateCleared = dto.trialEndDate === null || dto.trialEndDate === undefined;

    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    // Update properties (activationDate is immutable)
    if (validatedDto.expirationDate !== undefined) {
      subscription.props.expirationDate = validatedDto.expirationDate ? new Date(validatedDto.expirationDate) : undefined;
    }
    if (validatedDto.cancellationDate !== undefined) {
      subscription.props.cancellationDate = validatedDto.cancellationDate ? new Date(validatedDto.cancellationDate) : undefined;
    }
    // Handle trialEndDate updates
    if (validatedDto.trialEndDate !== undefined || wasTrialEndDateCleared) {
      const newTrialEndDate = validatedDto.trialEndDate ? new Date(validatedDto.trialEndDate) : undefined;
      subscription.props.trialEndDate = newTrialEndDate;
    }
    if (validatedDto.currentPeriodStart !== undefined) {
      subscription.props.currentPeriodStart = validatedDto.currentPeriodStart ? new Date(validatedDto.currentPeriodStart) : undefined;
    }
    if (validatedDto.currentPeriodEnd !== undefined) {
      subscription.props.currentPeriodEnd = validatedDto.currentPeriodEnd ? new Date(validatedDto.currentPeriodEnd) : undefined;
    }
    if (validatedDto.metadata !== undefined) {
      subscription.props.metadata = validatedDto.metadata;
    }
    if (validatedDto.billingCycleKey !== undefined) {
      // Find the new billing cycle
      const billingCycle = await this.billingCycleRepository.findByKey(validatedDto.billingCycleKey);
      if (!billingCycle) {
        throw new NotFoundError(`Billing cycle with key '${validatedDto.billingCycleKey}' not found`);
      }
      subscription.props.billingCycleId = billingCycle.id;
      subscription.props.planId = billingCycle.props.planId; // Update plan ID to match new billing cycle
    }

    subscription.props.updatedAt = now();
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
      const customer = await this.customerRepository.findByKey(filters.customerKey);
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
        const plan = await this.planRepository.findByKey(filters.planKey);
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

  async findSubscriptions(filters: DetailedSubscriptionFilterDto): Promise<SubscriptionDto[]> {
    const validationResult = DetailedSubscriptionFilterDtoSchema.safeParse(filters);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid filter parameters',
        validationResult.error.errors
      );
    }

    // For now, use the basic listSubscriptions with the basic filters
    // TODO: Implement advanced filtering in repository layer
    const basicFilters: SubscriptionFilterDto = {
      customerKey: filters.customerKey,
      productKey: filters.productKey,
      planKey: filters.planKey,
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: filters.limit,
      offset: filters.offset
    };

    let subscriptions = await this.subscriptionRepository.findAll(basicFilters);
    
    // Apply additional filters post-fetch (basic implementation)
    
    if (filters.hasStripeId !== undefined) {
      const hasStripe = filters.hasStripeId;
      subscriptions = subscriptions.filter(s => hasStripe ? !!s.props.stripeSubscriptionId : !s.props.stripeSubscriptionId);
    }
    
    if (filters.hasTrial !== undefined) {
      const hasTrial = filters.hasTrial;
      subscriptions = subscriptions.filter(s => hasTrial ? !!s.props.trialEndDate : !s.props.trialEndDate);
    }
    
    if (filters.hasFeatureOverrides !== undefined) {
      const hasOverrides = filters.hasFeatureOverrides;
      subscriptions = subscriptions.filter(s => hasOverrides ? s.props.featureOverrides.length > 0 : s.props.featureOverrides.length === 0);
    }
    
    // Apply date range filters
    if (filters.activationDateFrom) {
      subscriptions = subscriptions.filter(s => s.props.activationDate && s.props.activationDate >= filters.activationDateFrom!);
    }
    if (filters.activationDateTo) {
      subscriptions = subscriptions.filter(s => s.props.activationDate && s.props.activationDate <= filters.activationDateTo!);
    }
    if (filters.expirationDateFrom) {
      subscriptions = subscriptions.filter(s => s.props.expirationDate && s.props.expirationDate >= filters.expirationDateFrom!);
    }
    if (filters.expirationDateTo) {
      subscriptions = subscriptions.filter(s => s.props.expirationDate && s.props.expirationDate <= filters.expirationDateTo!);
    }
    if (filters.trialEndDateFrom) {
      subscriptions = subscriptions.filter(s => s.props.trialEndDate && s.props.trialEndDate >= filters.trialEndDateFrom!);
    }
    if (filters.trialEndDateTo) {
      subscriptions = subscriptions.filter(s => s.props.trialEndDate && s.props.trialEndDate <= filters.trialEndDateTo!);
    }
    if (filters.currentPeriodStartFrom) {
      subscriptions = subscriptions.filter(s => s.props.currentPeriodStart && s.props.currentPeriodStart >= filters.currentPeriodStartFrom!);
    }
    if (filters.currentPeriodStartTo) {
      subscriptions = subscriptions.filter(s => s.props.currentPeriodStart && s.props.currentPeriodStart <= filters.currentPeriodStartTo!);
    }
    if (filters.currentPeriodEndFrom) {
      subscriptions = subscriptions.filter(s => s.props.currentPeriodEnd && s.props.currentPeriodEnd >= filters.currentPeriodEndFrom!);
    }
    if (filters.currentPeriodEndTo) {
      subscriptions = subscriptions.filter(s => s.props.currentPeriodEnd && s.props.currentPeriodEnd <= filters.currentPeriodEndTo!);
    }
    
    const dtos: SubscriptionDto[] = [];
    for (const subscription of subscriptions) {
      const keys = await this.resolveSubscriptionKeys(subscription);
      dtos.push(SubscriptionMapper.toDto(subscription, keys.customerKey, keys.productKey, keys.planKey, keys.billingCycleKey));
    }
    return dtos;
  }

  async getSubscriptionsByCustomer(customerKey: string): Promise<SubscriptionDto[]> {
    const customer = await this.customerRepository.findByKey(customerKey);
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

  async archiveSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    subscription.archive();
    await this.subscriptionRepository.save(subscription);
  }

  async unarchiveSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    subscription.unarchive();
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
    FeatureValueValidator.validate(value, feature.props.valueType);

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


  private calculatePeriodEnd(startDate: Date, billingCycle: any): Date | null {
    // For forever billing cycles, return null (never expires)
    if (billingCycle.props.durationUnit === 'forever') {
      return null;
    }
    
    const endDate = new Date(startDate);
    
    switch (billingCycle.props.durationUnit) {
      case 'days':
        endDate.setDate(endDate.getDate() + billingCycle.props.durationValue);
        break;
      case 'weeks':
        endDate.setDate(endDate.getDate() + (billingCycle.props.durationValue * 7));
        break;
      case 'months':
        endDate.setMonth(endDate.getMonth() + billingCycle.props.durationValue);
        break;
      case 'years':
        endDate.setFullYear(endDate.getFullYear() + billingCycle.props.durationValue);
        break;
      default:
        throw new ValidationError(`Unknown duration unit: ${billingCycle.props.durationUnit}`);
    }
    
    return endDate;
  }

  /**
   * Process automatic transitions for subscriptions that have expired or been cancelled
   * This method should be called periodically by the implementor
   */
  async processAutomaticTransitions(): Promise<number> {
    const currentTime = now();
    let transitionsProcessed = 0;

    // Find all subscriptions that need automatic transition
    const subscriptionsToTransition = await this.findSubscriptionsForTransition(currentTime);
    
    for (const subscription of subscriptionsToTransition) {
      await this.processSubscriptionTransition(subscription);
      transitionsProcessed++;
    }

    return transitionsProcessed;
  }

  /**
   * Find subscriptions that need automatic transition
   */
  private async findSubscriptionsForTransition(now: Date) {
    // Find subscriptions where:
    // 1. currentPeriodEnd has passed (currentPeriodEnd < now)
    // 2. The plan has onExpireTransitionToBillingCycleKey configured
    // 3. Don't check status - handle both cancelled and expired subscriptions
    
    // Get all subscriptions (don't filter by status - handle both cancelled and expired)
    const subscriptions = await this.subscriptionRepository.findAll({
      limit: 100,
      offset: 0
    });

    const subscriptionsToTransition = [];

    for (const subscription of subscriptions) {
      // Check if period has ended (currentPeriodEnd < now)
      if (!subscription.props.currentPeriodEnd || subscription.props.currentPeriodEnd >= now) {
        continue; // Period hasn't ended yet
      }

      // Get the plan to check for transition configuration
      const plan = await this.planRepository.findById(subscription.planId);
      if (!plan || !plan.props.onExpireTransitionToBillingCycleKey) {
        continue; // No automatic transition configured
      }

      subscriptionsToTransition.push(subscription);
    }
    return subscriptionsToTransition;
  }

  /**
   * Process a single subscription transition
   */
  private async processSubscriptionTransition(subscription: any): Promise<void> {
    // Get the plan to check for transition configuration
    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundError(`Plan ${subscription.planId} not found`);
    }

    // Find the target billing cycle
    if (!plan.props.onExpireTransitionToBillingCycleKey) {
      throw new DomainError('Plan does not have transition configuration');
    }
    
    const targetBillingCycle = await this.billingCycleRepository.findByKey(
      plan.props.onExpireTransitionToBillingCycleKey
    );
    if (!targetBillingCycle) {
      throw new NotFoundError(
        `Target billing cycle ${plan.props.onExpireTransitionToBillingCycleKey} not found`
      );
    }

    // Find the target plan (should be the same product)
    const targetPlan = await this.planRepository.findByBillingCycleId(targetBillingCycle.id);
    if (!targetPlan) {
      throw new NotFoundError(
        `Target plan for billing cycle ${plan.props.onExpireTransitionToBillingCycleKey} not found`
      );
    }

    // Update the existing subscription to the target plan
    subscription.props.planId = targetPlan.id;
    subscription.props.billingCycleId = targetBillingCycle.id;
    subscription.props.status = SubscriptionStatus.Active;
    subscription.props.activationDate = now();
    subscription.props.currentPeriodStart = now();
    subscription.props.currentPeriodEnd = targetBillingCycle.calculateNextPeriodEnd(now());
    subscription.props.featureOverrides = []; // Clear all overrides for the new plan
    subscription.props.updatedAt = now();

    // Save the updated subscription
    await this.subscriptionRepository.save(subscription);
  }
}
