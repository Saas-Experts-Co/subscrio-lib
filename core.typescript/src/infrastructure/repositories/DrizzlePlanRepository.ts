import { IPlanRepository } from '../../application/repositories/IPlanRepository.js';
import { Plan, PlanFeatureValue } from '../../domain/entities/Plan.js';
import { PlanMapper } from '../../application/mappers/PlanMapper.js';
import { DrizzleDb } from '../database/drizzle.js';
import { plans, plan_features, billing_cycles } from '../database/schema.js';
import { eq, and, like, or, desc, asc } from 'drizzle-orm';
import { PlanFilterDto } from '../../application/dtos/PlanDto.js';
import { generateId } from '../utils/uuid.js';

export class DrizzlePlanRepository implements IPlanRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(plan: Plan): Promise<void> {
    const record = PlanMapper.toPersistence(plan);
    await this.db
      .insert(plans)
      .values(record)
      .onConflictDoUpdate({
        target: plans.id,
        set: record
      });

    // Delete existing feature values
    await this.db.delete(plan_features).where(eq(plan_features.plan_id, plan.id));

    // Insert new feature values
    if (plan.props.featureValues.length > 0) {
      const featureValueRecords = plan.props.featureValues.map(fv => ({
        id: generateId(),
        plan_id: plan.id,
        feature_id: fv.featureId,
        value: fv.value,
        created_at: fv.createdAt,
        updated_at: fv.updatedAt
      }));

      await this.db.insert(plan_features).values(featureValueRecords);
    }
  }

  async findById(id: string): Promise<Plan | null> {
    const [record] = await this.db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);
    
    if (!record) return null;

    const featureValues = await this.loadFeatureValues(record.id);
    return PlanMapper.toDomain(record, featureValues);
  }

  async findByKey(key: string): Promise<Plan | null> {
    const [record] = await this.db
      .select()
      .from(plans)
      .where(eq(plans.key, key))
      .limit(1);
    
    if (!record) return null;

    const featureValues = await this.loadFeatureValues(record.id);
    return PlanMapper.toDomain(record, featureValues);
  }

  private async loadFeatureValues(planId: string): Promise<PlanFeatureValue[]> {
    const records = await this.db
      .select()
      .from(plan_features)
      .where(eq(plan_features.plan_id, planId));

    return records.map(r => ({
      featureId: r.feature_id,
      value: r.value,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at)
    }));
  }

  async findByProduct(productKey: string): Promise<Plan[]> {
    const records = await this.db
      .select()
      .from(plans)
      .where(eq(plans.product_key, productKey))
      .orderBy(asc(plans.created_at));

    const plansWithValues = [];
    for (const record of records) {
      const featureValues = await this.loadFeatureValues(record.id);
      plansWithValues.push(PlanMapper.toDomain(record, featureValues));
    }
    return plansWithValues;
  }

  async findAll(filters?: PlanFilterDto): Promise<Plan[]> {
    let query = this.db.select().from(plans);

    if (filters) {
      const conditions = [];

      if (filters.productKey) {
        conditions.push(eq(plans.product_key, filters.productKey));
      }

      if (filters.status) {
        conditions.push(eq(plans.status, filters.status));
      }

      if (filters.search) {
        // Sanitize search input to prevent SQL injection
        const sanitizedSearch = filters.search.replace(/[%_\\]/g, '\\$&');
        conditions.push(
          or(
            like(plans.key, `%${sanitizedSearch}%`),
            like(plans.display_name, `%${sanitizedSearch}%`),
            like(plans.description, `%${sanitizedSearch}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'asc';
      
      if (sortBy === 'displayName') {
        query = query.orderBy(sortOrder === 'desc' ? desc(plans.display_name) : asc(plans.display_name)) as typeof query;
      } else {
        query = query.orderBy(sortOrder === 'desc' ? desc(plans.created_at) : asc(plans.created_at)) as typeof query;
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit) as typeof query;
      }
      if (filters.offset) {
        query = query.offset(filters.offset) as typeof query;
      }
    } else {
      query = query.orderBy(asc(plans.created_at)) as typeof query;
    }

    const records = await query;
    
    const plansWithValues = [];
    for (const record of records) {
      const featureValues = await this.loadFeatureValues(record.id);
      plansWithValues.push(PlanMapper.toDomain(record, featureValues));
    }
    return plansWithValues;
  }


  async findByIds(ids: string[]): Promise<Plan[]> {
    if (ids.length === 0) return [];

    const records = await this.db
      .select()
      .from(plans)
      .where(eq(plans.id, ids[0])); // This is simplified - would need proper IN clause

    const plansWithValues = [];
    for (const record of records) {
      const featureValues = await this.loadFeatureValues(record.id);
      plansWithValues.push(PlanMapper.toDomain(record, featureValues));
    }
    return plansWithValues;
  }

  async findByBillingCycleId(billingCycleId: string): Promise<Plan | null> {
    // Find plan by billing cycle ID - need to join with billing_cycles table
    const [record] = await this.db
      .select()
      .from(plans)
      .innerJoin(billing_cycles, eq(plans.id, billing_cycles.plan_id))
      .where(eq(billing_cycles.id, billingCycleId))
      .limit(1);
    
    if (!record) return null;
    
    const featureValues = await this.loadFeatureValues(record.plans.id);
    return PlanMapper.toDomain(record.plans, featureValues);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(plans).where(eq(plans.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);
    
    return !!record;
  }

}
