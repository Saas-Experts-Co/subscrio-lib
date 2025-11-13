import { ISubscriptionRepository } from '../../application/repositories/ISubscriptionRepository.js';
import { Subscription, FeatureOverride } from '../../domain/entities/Subscription.js';
import { SubscriptionMapper } from '../../application/mappers/SubscriptionMapper.js';
import { DrizzleDb } from '../database/drizzle.js';
import { subscriptions, subscription_feature_overrides } from '../database/schema.js';
import { eq, and, desc, asc, inArray, gte, lte, isNotNull, isNull } from 'drizzle-orm';
import { SubscriptionFilterDto } from '../../application/dtos/SubscriptionDto.js';
import { OverrideType } from '../../domain/value-objects/OverrideType.js';

export class DrizzleSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(subscription: Subscription): Promise<Subscription> {
    const record = SubscriptionMapper.toPersistence(subscription);
    
    let savedSubscriptionId: number;
    if (subscription.id === undefined) {
      // Insert new entity
      const [inserted] = await this.db
        .insert(subscriptions)
        .values(record)
        .returning({ id: subscriptions.id });
      
      savedSubscriptionId = inserted.id;
      
      // Insert feature overrides
      if (subscription.props.featureOverrides.length > 0) {
        const overrideRecords = subscription.props.featureOverrides.map(override => ({
          subscription_id: savedSubscriptionId,
          feature_id: override.featureId,
          value: override.value,
          override_type: override.type,
          created_at: override.createdAt
        }));

        await this.db.insert(subscription_feature_overrides).values(overrideRecords);
      }
      
      // Return entity with generated ID
      return new Subscription(subscription.props, savedSubscriptionId);
    } else {
      // Update existing entity
      savedSubscriptionId = subscription.id;
      
      await this.db
        .update(subscriptions)
        .set({
          key: record.key,
          customer_id: record.customer_id,
          plan_id: record.plan_id,
          billing_cycle_id: record.billing_cycle_id,
          status: record.status,
          is_archived: record.is_archived,
          activation_date: record.activation_date,
          expiration_date: record.expiration_date,
          cancellation_date: record.cancellation_date,
          trial_end_date: record.trial_end_date,
          current_period_start: record.current_period_start,
          current_period_end: record.current_period_end,
          stripe_subscription_id: record.stripe_subscription_id,
          metadata: record.metadata,
          updated_at: record.updated_at
        })
        .where(eq(subscriptions.id, subscription.id));

      // Delete existing feature overrides
      await this.db.delete(subscription_feature_overrides).where(eq(subscription_feature_overrides.subscription_id, subscription.id));

      // Insert new feature overrides
      if (subscription.props.featureOverrides.length > 0) {
        const overrideRecords = subscription.props.featureOverrides.map(override => ({
          subscription_id: subscription.id,
          feature_id: override.featureId,
          value: override.value,
          override_type: override.type,
          created_at: override.createdAt
        }));

        await this.db.insert(subscription_feature_overrides).values(overrideRecords);
      }
      
      return subscription;
    }
  }

  private async loadFeatureOverrides(subscriptionId: number): Promise<FeatureOverride[]> {
    const records = await this.db
      .select()
      .from(subscription_feature_overrides)
      .where(eq(subscription_feature_overrides.subscription_id, subscriptionId));

    return records.map(r => ({
      featureId: r.feature_id as number,
      value: r.value,
      type: r.override_type as OverrideType,
      createdAt: new Date(r.created_at)
    }));
  }

  async findById(id: number): Promise<Subscription | null> {
    const [record] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    
    if (!record) return null;

    const featureOverrides = await this.loadFeatureOverrides(record.id);
    return SubscriptionMapper.toDomain(record, featureOverrides);
  }

  async findByKey(key: string): Promise<Subscription | null> {
    const [record] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.key, key))
      .limit(1);
    
    if (!record) return null;

    const featureOverrides = await this.loadFeatureOverrides(record.id);
    return SubscriptionMapper.toDomain(record, featureOverrides);
  }

  async findByStripeId(stripeId: string): Promise<Subscription | null> {
    const [record] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripe_subscription_id, stripeId))
      .limit(1);
    
    if (!record) return null;

    const featureOverrides = await this.loadFeatureOverrides(record.id);
    return SubscriptionMapper.toDomain(record, featureOverrides);
  }

  async findAll(filters?: SubscriptionFilterDto): Promise<Subscription[]> {
    // Build SQL query with proper WHERE clauses for IDs
    let query = this.db.select().from(subscriptions);

    if (filters) {
      const conditions = [];

      // Filter by customer ID (resolved from customerKey in service layer)
      if ((filters as any).customerId) {
        conditions.push(eq(subscriptions.customer_id, (filters as any).customerId));
      }

      // Filter by plan IDs (resolved from planKey or productKey in service layer)
      if ((filters as any).planIds && (filters as any).planIds.length > 0) {
        conditions.push(inArray(subscriptions.plan_id, (filters as any).planIds));
      } else if ((filters as any).planId) {
        conditions.push(eq(subscriptions.plan_id, (filters as any).planId));
      }

      // Filter by billing cycle ID (resolved from billingCycleKey in service layer)
      if ((filters as any).billingCycleId) {
        conditions.push(eq(subscriptions.billing_cycle_id, (filters as any).billingCycleId));
      }

      // Filter by date ranges (can be done in SQL)
      if ((filters as any).activationDateFrom) {
        conditions.push(gte(subscriptions.activation_date, (filters as any).activationDateFrom));
      }
      if ((filters as any).activationDateTo) {
        conditions.push(lte(subscriptions.activation_date, (filters as any).activationDateTo));
      }
      if ((filters as any).expirationDateFrom) {
        conditions.push(gte(subscriptions.expiration_date, (filters as any).expirationDateFrom));
      }
      if ((filters as any).expirationDateTo) {
        conditions.push(lte(subscriptions.expiration_date, (filters as any).expirationDateTo));
      }
      if ((filters as any).trialEndDateFrom) {
        conditions.push(gte(subscriptions.trial_end_date, (filters as any).trialEndDateFrom));
      }
      if ((filters as any).trialEndDateTo) {
        conditions.push(lte(subscriptions.trial_end_date, (filters as any).trialEndDateTo));
      }
      if ((filters as any).currentPeriodStartFrom) {
        conditions.push(gte(subscriptions.current_period_start, (filters as any).currentPeriodStartFrom));
      }
      if ((filters as any).currentPeriodStartTo) {
        conditions.push(lte(subscriptions.current_period_start, (filters as any).currentPeriodStartTo));
      }
      if ((filters as any).currentPeriodEndFrom) {
        conditions.push(gte(subscriptions.current_period_end, (filters as any).currentPeriodEndFrom));
      }
      if ((filters as any).currentPeriodEndTo) {
        conditions.push(lte(subscriptions.current_period_end, (filters as any).currentPeriodEndTo));
      }

      // Filter by hasStripeId
      if ((filters as any).hasStripeId !== undefined) {
        if ((filters as any).hasStripeId) {
          conditions.push(isNotNull(subscriptions.stripe_subscription_id));
        } else {
          conditions.push(isNull(subscriptions.stripe_subscription_id));
        }
      }

      // Filter by hasTrial
      if ((filters as any).hasTrial !== undefined) {
        if ((filters as any).hasTrial) {
          conditions.push(isNotNull(subscriptions.trial_end_date));
        } else {
          conditions.push(isNull(subscriptions.trial_end_date));
        }
      }

      // Note: We don't filter by status here since status is computed from dates
      // Status filtering will be done after loading entities

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      
      if (sortBy === 'activationDate') {
        query = query.orderBy(sortOrder === 'desc' ? desc(subscriptions.activation_date) : asc(subscriptions.activation_date)) as typeof query;
      } else if (sortBy === 'expirationDate') {
        query = query.orderBy(sortOrder === 'desc' ? desc(subscriptions.expiration_date) : asc(subscriptions.expiration_date)) as typeof query;
      } else if (sortBy === 'currentPeriodStart') {
        query = query.orderBy(sortOrder === 'desc' ? desc(subscriptions.current_period_start) : asc(subscriptions.current_period_start)) as typeof query;
      } else if (sortBy === 'currentPeriodEnd') {
        query = query.orderBy(sortOrder === 'desc' ? desc(subscriptions.current_period_end) : asc(subscriptions.current_period_end)) as typeof query;
      } else {
        query = query.orderBy(sortOrder === 'desc' ? desc(subscriptions.created_at) : asc(subscriptions.created_at)) as typeof query;
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit) as typeof query;
      }
      if (filters.offset) {
        query = query.offset(filters.offset) as typeof query;
      }
    } else {
      query = query.orderBy(desc(subscriptions.created_at)) as typeof query;
    }

    const records = await query;
    
    const subscriptionsWithOverrides = [];
    for (const record of records) {
      const featureOverrides = await this.loadFeatureOverrides(record.id);
      const subscription = SubscriptionMapper.toDomain(record, featureOverrides);
      // Filter by computed status if status filter is provided
      if (filters?.status && subscription.status !== filters.status) {
        continue; // Skip subscriptions that don't match computed status
      }
      subscriptionsWithOverrides.push(subscription);
    }
    return subscriptionsWithOverrides;
  }

  async findByCustomerId(customerId: number, filters?: any): Promise<Subscription[]> {
    const conditions = [eq(subscriptions.customer_id, customerId)];
    
    // Don't filter by status in database - status is computed from dates
    // We'll filter by computed status after loading entities

    const records = await this.db
      .select()
      .from(subscriptions)
      .where(and(...conditions))
      .orderBy(desc(subscriptions.created_at));

    const subscriptionsWithOverrides = [];
    for (const record of records) {
      const featureOverrides = await this.loadFeatureOverrides(record.id);
      const subscription = SubscriptionMapper.toDomain(record, featureOverrides);
      // Filter by computed status if status filter is provided
      if (filters?.status && subscription.status !== filters.status) {
        continue; // Skip subscriptions that don't match computed status
      }
      subscriptionsWithOverrides.push(subscription);
    }
    return subscriptionsWithOverrides;
  }

  async findByIds(ids: number[]): Promise<Subscription[]> {
    if (ids.length === 0) return [];

    const records = await this.db
      .select()
      .from(subscriptions)
      .where(inArray(subscriptions.id, ids));

    const subscriptionsWithOverrides = [];
    for (const record of records) {
      const featureOverrides = await this.loadFeatureOverrides(record.id);
      subscriptionsWithOverrides.push(SubscriptionMapper.toDomain(record, featureOverrides));
    }
    return subscriptionsWithOverrides;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  async findActiveByCustomerAndPlan(customerId: number, planId: number): Promise<Subscription | null> {
    // Don't filter by stored status - filter by computed status after loading
    const records = await this.db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.customer_id, customerId),
        eq(subscriptions.plan_id, planId)
      ))
      .limit(100); // Load multiple to check computed status

    for (const record of records) {
      const featureOverrides = await this.loadFeatureOverrides(record.id);
      const subscription = SubscriptionMapper.toDomain(record, featureOverrides);
      // Check computed status
      if (subscription.status === 'active' || subscription.status === 'trial') {
        return subscription;
      }
    }
    return null;
  }

  async exists(id: number): Promise<boolean> {
    const [record] = await this.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    
    return !!record;
  }

  async hasSubscriptionsForPlan(planId: number): Promise<boolean> {
    const [record] = await this.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.plan_id, planId))
      .limit(1);

    return !!record;
  }

  async hasSubscriptionsForBillingCycle(billingCycleId: number): Promise<boolean> {
    const [record] = await this.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.billing_cycle_id, billingCycleId))
      .limit(1);

    return !!record;
  }
}
