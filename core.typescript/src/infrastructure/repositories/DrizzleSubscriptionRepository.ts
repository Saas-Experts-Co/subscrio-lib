import { ISubscriptionRepository } from '../../application/repositories/ISubscriptionRepository.js';
import { Subscription, FeatureOverride } from '../../domain/entities/Subscription.js';
import { SubscriptionMapper } from '../../application/mappers/SubscriptionMapper.js';
import { DrizzleDb } from '../database/drizzle.js';
import { subscriptions, subscription_feature_overrides } from '../database/schema.js';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { SubscriptionFilterDto } from '../../application/dtos/SubscriptionDto.js';
import { OverrideType } from '../../domain/value-objects/OverrideType.js';
import { generateId } from '../utils/uuid.js';

export class DrizzleSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(subscription: Subscription): Promise<void> {
    const record = SubscriptionMapper.toPersistence(subscription);
    await this.db
      .insert(subscriptions)
      .values(record)
      .onConflictDoUpdate({
        target: subscriptions.id,
        set: record
      });

    // Delete existing feature overrides
    await this.db.delete(subscription_feature_overrides).where(eq(subscription_feature_overrides.subscription_id, subscription.id));

    // Insert new feature overrides
    if (subscription.props.featureOverrides.length > 0) {
      const overrideRecords = subscription.props.featureOverrides.map(override => ({
        id: generateId(),
        subscription_id: subscription.id,
        feature_id: override.featureId,
        value: override.value,
        override_type: override.type,
        created_at: override.createdAt
      }));

      await this.db.insert(subscription_feature_overrides).values(overrideRecords);
    }
  }

  private async loadFeatureOverrides(subscriptionId: string): Promise<FeatureOverride[]> {
    const records = await this.db
      .select()
      .from(subscription_feature_overrides)
      .where(eq(subscription_feature_overrides.subscription_id, subscriptionId));

    return records.map(r => ({
      featureId: r.feature_id,
      value: r.value,
      type: r.override_type as OverrideType,
      createdAt: new Date(r.created_at)
    }));
  }

  async findById(id: string): Promise<Subscription | null> {
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
    let query = this.db.select().from(subscriptions);

    if (filters) {
      const conditions = [];

      if (filters.status) {
        conditions.push(eq(subscriptions.status, filters.status));
      }

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
      subscriptionsWithOverrides.push(SubscriptionMapper.toDomain(record, featureOverrides));
    }
    return subscriptionsWithOverrides;
  }

  async findByCustomerId(customerId: string, filters?: any): Promise<Subscription[]> {
    const conditions = [eq(subscriptions.customer_id, customerId)];
    
    if (filters?.status) {
      conditions.push(eq(subscriptions.status, filters.status));
    }

    const records = await this.db
      .select()
      .from(subscriptions)
      .where(and(...conditions))
      .orderBy(desc(subscriptions.created_at));

    const subscriptionsWithOverrides = [];
    for (const record of records) {
      const featureOverrides = await this.loadFeatureOverrides(record.id);
      subscriptionsWithOverrides.push(SubscriptionMapper.toDomain(record, featureOverrides));
    }
    return subscriptionsWithOverrides;
  }

  async findByIds(ids: string[]): Promise<Subscription[]> {
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

  async delete(id: string): Promise<void> {
    await this.db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  async findActiveByCustomerAndPlan(customerId: string, planId: string): Promise<Subscription | null> {
    const [record] = await this.db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.customer_id, customerId),
        eq(subscriptions.plan_id, planId),
        eq(subscriptions.status, 'active')
      ))
      .limit(1);

    if (!record) return null;

    const featureOverrides = await this.loadFeatureOverrides(record.id);
    return SubscriptionMapper.toDomain(record, featureOverrides);
  }

  async exists(id: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    
    return !!record;
  }
}
