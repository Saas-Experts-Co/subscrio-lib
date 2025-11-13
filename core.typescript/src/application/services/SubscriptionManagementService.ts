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
      // This should never happen in normal operation, but log error with subscription key
      throw new NotFoundError(
        `Customer not found for subscription '${subscription.key}'. ` +
        'This indicates data integrity issue - subscription references invalid customer.'
      );
    }

    // Get plan
    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      // This should never happen in normal operation, but log error with subscription key
      throw new NotFoundError(
        `Plan not found for subscription '${subscription.key}'. ` +
        'This indicates data integrity issue - subscription references invalid plan.'
      );
    }

    // Get billing cycle (required)
    const cycle = await this.billingCycleRepository.findById(subscription.props.billingCycleId);
    if (!cycle) {
      // This should never happen in normal operation, but log error with subscription key
      throw new NotFoundError(
        `Billing cycle not found for subscription '${subscription.key}'. ` +
        'This indicates data integrity issue - subscription references invalid billing cycle.'
      );
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

    if (customer.id === undefined || plan.id === undefined || billingCycleId === undefined) {
      throw new Error('Customer, plan, or billing cycle ID is undefined');
    }

    const trialEndDate = validatedDto.trialEndDate ? new Date(validatedDto.trialEndDate) : undefined;
    
    // Calculate currentPeriodEnd based on billing cycle duration
    const currentPeriodStart = validatedDto.currentPeriodStart ? new Date(validatedDto.currentPeriodStart) : now();
    const currentPeriodEnd = validatedDto.currentPeriodEnd 
      ? new Date(validatedDto.currentPeriodEnd) 
      : this.calculatePeriodEnd(currentPeriodStart, billingCycle);
    
    
    // Create domain entity (no ID - database will generate)
    const subscription = new Subscription({
      key: validatedDto.key,  // User-supplied key
      customerId: customer.id,
      planId: plan.id,
      billingCycleId,
      status: SubscriptionStatus.Active,  // Default status, will be calculated dynamically
      isArchived: false,
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
    });
    
    // Sync status after creation to ensure stored status matches computed status
    subscription.syncStatus();

    // Save and get entity with generated ID
    const savedSubscription = await this.subscriptionRepository.save(subscription);

    const keys = await this.resolveSubscriptionKeys(savedSubscription);
    return SubscriptionMapper.toDto(
      savedSubscription,
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

    // Block updates if subscription is archived
    if (subscription.isArchived) {
      throw new DomainError(
        `Cannot update archived subscription with key '${subscriptionKey}'. ` +
        'Please unarchive the subscription first.'
      );
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
    // Sync status before saving to ensure database status matches computed status
    subscription.syncStatus();
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


  /**
   * Resolve filter keys to IDs for database querying
   * Returns null if any required entity is not found (to indicate empty result)
   */
  private async resolveFilterKeys(filters: SubscriptionFilterDto | DetailedSubscriptionFilterDto): Promise<{
    customerId?: string;
    planIds?: string[];
    planId?: string;
    billingCycleId?: string;
    _emptyResult?: boolean; // Marker to indicate empty result
    [key: string]: any;
  } | null> {
    const resolved: any = {};

    // Resolve customerKey to customerId
    if (filters.customerKey) {
      const customer = await this.customerRepository.findByKey(filters.customerKey);
      if (!customer) {
        // Customer not found - return null to indicate empty result
        return null;
      }
      resolved.customerId = customer.id;
    }

    // Resolve planKey and/or productKey to planIds
    if (filters.planKey) {
      if (filters.productKey) {
        // Both planKey and productKey - find specific plan
        const plan = await this.planRepository.findByKey(filters.planKey);
        if (!plan || plan.productKey !== filters.productKey) {
          // Plan not found or doesn't belong to product - return null to indicate empty result
          return null;
        }
        resolved.planId = plan.id;
      } else {
        // Only planKey - plan keys are globally unique, so findByKey is sufficient
        const plan = await this.planRepository.findByKey(filters.planKey);
        if (!plan) {
          return null;
        }
        resolved.planId = plan.id;
      }
    } else if (filters.productKey) {
      // Only productKey - find all plans for this product
      const product = await this.productRepository.findByKey(filters.productKey);
      if (!product) {
        return { planIds: [] };
      }
      const plans = await this.planRepository.findByProduct(product.key);
      if (plans.length === 0) {
        return { planIds: [] };
      }
      resolved.planIds = plans.map(p => p.id);
    }

    // Resolve billingCycleKey to billingCycleId (only for DetailedSubscriptionFilterDto)
    if ('billingCycleKey' in filters && filters.billingCycleKey) {
      const billingCycle = await this.billingCycleRepository.findByKey(filters.billingCycleKey);
      if (!billingCycle) {
        return null;
      }
      resolved.billingCycleId = billingCycle.id;
    }

    // Copy other filter properties (date ranges, etc.)
    if ('activationDateFrom' in filters && filters.activationDateFrom) {
      resolved.activationDateFrom = filters.activationDateFrom;
    }
    if ('activationDateTo' in filters && filters.activationDateTo) {
      resolved.activationDateTo = filters.activationDateTo;
    }
    if ('expirationDateFrom' in filters && filters.expirationDateFrom) {
      resolved.expirationDateFrom = filters.expirationDateFrom;
    }
    if ('expirationDateTo' in filters && filters.expirationDateTo) {
      resolved.expirationDateTo = filters.expirationDateTo;
    }
    if ('trialEndDateFrom' in filters && filters.trialEndDateFrom) {
      resolved.trialEndDateFrom = filters.trialEndDateFrom;
    }
    if ('trialEndDateTo' in filters && filters.trialEndDateTo) {
      resolved.trialEndDateTo = filters.trialEndDateTo;
    }
    if ('currentPeriodStartFrom' in filters && filters.currentPeriodStartFrom) {
      resolved.currentPeriodStartFrom = filters.currentPeriodStartFrom;
    }
    if ('currentPeriodStartTo' in filters && filters.currentPeriodStartTo) {
      resolved.currentPeriodStartTo = filters.currentPeriodStartTo;
    }
    if ('currentPeriodEndFrom' in filters && filters.currentPeriodEndFrom) {
      resolved.currentPeriodEndFrom = filters.currentPeriodEndFrom;
    }
    if ('currentPeriodEndTo' in filters && filters.currentPeriodEndTo) {
      resolved.currentPeriodEndTo = filters.currentPeriodEndTo;
    }
    if ('hasStripeId' in filters && filters.hasStripeId !== undefined) {
      resolved.hasStripeId = filters.hasStripeId;
    }
    if ('hasTrial' in filters && filters.hasTrial !== undefined) {
      resolved.hasTrial = filters.hasTrial;
    }

    return resolved;
  }

  async listSubscriptions(filters?: SubscriptionFilterDto): Promise<SubscriptionDto[]> {
    const validationResult = SubscriptionFilterDtoSchema.safeParse(filters || {});
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid filter parameters',
        validationResult.error.errors
      );
    }

    // Resolve keys to IDs first
    const resolvedFilters = await this.resolveFilterKeys(validationResult.data);

    // If any key resolution returned null/empty, return empty array
    if (!resolvedFilters || 
        (resolvedFilters.planIds && resolvedFilters.planIds.length === 0)) {
      return [];
    }

    // Merge resolved IDs with other filter properties (sortBy, sortOrder, limit, offset, status)
    const dbFilters: any = {
      ...resolvedFilters,
      sortBy: filters?.sortBy,
      sortOrder: filters?.sortOrder,
      limit: filters?.limit,
      offset: filters?.offset,
      status: filters?.status // Will be filtered post-fetch since it's computed
    };

    // Query repository with IDs - filtering happens in SQL
    const subscriptions = await this.subscriptionRepository.findAll(dbFilters);

    // Filter by computed status if status filter is provided (unavoidable post-fetch)
    let filteredSubscriptions = subscriptions;
    if (filters?.status) {
      filteredSubscriptions = subscriptions.filter(s => s.status === filters.status);
    }

    // Map to DTOs
    const dtos: SubscriptionDto[] = [];
    for (const subscription of filteredSubscriptions) {
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

    // Resolve keys to IDs first
    const resolvedFilters = await this.resolveFilterKeys(validationResult.data);

    // If any key resolution returned null/empty, return empty array
    if (!resolvedFilters || 
        (resolvedFilters.planIds && resolvedFilters.planIds.length === 0)) {
      return [];
    }

    // Merge resolved IDs with other filter properties (sortBy, sortOrder, limit, offset, status)
    const dbFilters: any = {
      ...resolvedFilters,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: filters.limit,
      offset: filters.offset,
      status: filters.status // Will be filtered post-fetch since it's computed
    };

    // Query repository with IDs - filtering happens in SQL
    const subscriptions = await this.subscriptionRepository.findAll(dbFilters);

    // Filter by computed status if status filter is provided (unavoidable post-fetch)
    let filteredSubscriptions = subscriptions;
    if (filters.status) {
      filteredSubscriptions = subscriptions.filter(s => s.status === filters.status);
    }

    // Filter by hasFeatureOverrides (unavoidable post-fetch since it requires loading feature overrides)
    if (filters.hasFeatureOverrides !== undefined) {
      const hasOverrides = filters.hasFeatureOverrides;
      filteredSubscriptions = filteredSubscriptions.filter(s => 
        hasOverrides ? s.props.featureOverrides.length > 0 : s.props.featureOverrides.length === 0
      );
    }

    // Map to DTOs
    const dtos: SubscriptionDto[] = [];
    for (const subscription of filteredSubscriptions) {
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

    // Archive does not change any properties - just sets the archive flag
    subscription.archive();
    // Sync status before saving
    subscription.syncStatus();
    await this.subscriptionRepository.save(subscription);
  }

  async unarchiveSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    // Unarchive just clears the archive flag
    subscription.unarchive();
    // Sync status before saving
    subscription.syncStatus();
    await this.subscriptionRepository.save(subscription);
  }

  async deleteSubscription(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    // No deletion constraint - subscriptions can be deleted regardless of status
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

    // Block updates if subscription is archived
    if (subscription.isArchived) {
      throw new DomainError(
        `Cannot add feature override to archived subscription with key '${subscriptionKey}'. ` +
        'Please unarchive the subscription first.'
      );
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    // Validate value against feature type
    FeatureValueValidator.validate(value, feature.props.valueType);

    subscription.addFeatureOverride(feature.id, value, overrideType);
    subscription.syncStatus();
    await this.subscriptionRepository.save(subscription);
  }

  async removeFeatureOverride(subscriptionKey: string, featureKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    // Block updates if subscription is archived
    if (subscription.isArchived) {
      throw new DomainError(
        `Cannot remove feature override from archived subscription with key '${subscriptionKey}'. ` +
        'Please unarchive the subscription first.'
      );
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    subscription.removeFeatureOverride(feature.id);
    subscription.syncStatus();
    await this.subscriptionRepository.save(subscription);
  }

  async clearTemporaryOverrides(subscriptionKey: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundError(`Subscription with key '${subscriptionKey}' not found`);
    }

    // Block updates if subscription is archived
    if (subscription.isArchived) {
      throw new DomainError(
        `Cannot clear temporary overrides for archived subscription with key '${subscriptionKey}'. ` +
        'Please unarchive the subscription first.'
      );
    }

    subscription.clearTemporaryOverrides();
    subscription.syncStatus();
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
      // Skip if plan not found - log error but don't throw to avoid breaking batch processing
      // Don't expose internal IDs - use subscription key only
      console.error(`Plan not found for subscription '${subscription.key}'. This indicates a data integrity issue.`);
      return;
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
    subscription.props.activationDate = now();
    subscription.props.currentPeriodStart = now();
    subscription.props.currentPeriodEnd = targetBillingCycle.calculateNextPeriodEnd(now());
    subscription.props.featureOverrides = []; // Clear all overrides for the new plan
    subscription.props.expirationDate = undefined; // Clear expiration date
    subscription.props.cancellationDate = undefined; // Clear cancellation date
    subscription.props.updatedAt = now();

    // Sync status before saving to ensure database status matches computed status
    subscription.syncStatus();

    // Save the updated subscription
    await this.subscriptionRepository.save(subscription);
  }

  /**
   * Sync subscription statuses - updates stored status to match computed status
   * This should be called periodically to keep database status in sync with computed status
   * @param limit Maximum number of subscriptions to process (default: 1000)
   * @returns Number of subscriptions processed
   */
  async syncSubscriptionStatuses(limit: number = 1000): Promise<number> {
    // Get all subscriptions (without status filter since we're updating them)
    const subscriptions = await this.subscriptionRepository.findAll({
      limit,
      offset: 0
    });

    let syncedCount = 0;
    for (const subscription of subscriptions) {
      // Get current computed status
      const computedStatus = subscription.status;
      
      // If stored status doesn't match computed status, update it
      if (subscription.props.status !== computedStatus) {
        subscription.syncStatus();
        await this.subscriptionRepository.save(subscription);
        syncedCount++;
      }
    }

    return syncedCount;
  }
}
