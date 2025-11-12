import { IBillingCycleRepository } from '../../application/repositories/IBillingCycleRepository.js';
import { BillingCycle } from '../../domain/entities/BillingCycle.js';
import { BillingCycleMapper } from '../../application/mappers/BillingCycleMapper.js';
import { DrizzleDb } from '../database/drizzle.js';
import { billing_cycles } from '../database/schema.js';
import { eq, and, like, or, desc, asc } from 'drizzle-orm';
import { BillingCycleFilterDto } from '../../application/dtos/BillingCycleDto.js';
import { DurationUnit } from '../../domain/value-objects/DurationUnit.js';

export class DrizzleBillingCycleRepository implements IBillingCycleRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(billingCycle: BillingCycle): Promise<void> {
    const record = BillingCycleMapper.toPersistence(billingCycle);
    await this.db
      .insert(billing_cycles)
      .values(record)
      .onConflictDoUpdate({
        target: billing_cycles.id,
        set: record
      });
  }

  async findById(id: string): Promise<BillingCycle | null> {
    const [record] = await this.db
      .select()
      .from(billing_cycles)
      .where(eq(billing_cycles.id, id))
      .limit(1);
    
    return record ? BillingCycleMapper.toDomain(record) : null;
  }

  async findByKey(key: string): Promise<BillingCycle | null> {
    const [record] = await this.db
      .select()
      .from(billing_cycles)
      .where(eq(billing_cycles.key, key))
      .limit(1);
    
    return record ? BillingCycleMapper.toDomain(record) : null;
  }

  async findByPlan(planId: string): Promise<BillingCycle[]> {
    const records = await this.db
      .select()
      .from(billing_cycles)
      .where(eq(billing_cycles.plan_id, planId))
      .orderBy(asc(billing_cycles.created_at));
    
    return records.map(BillingCycleMapper.toDomain);
  }

  async findAll(filters?: BillingCycleFilterDto): Promise<BillingCycle[]> {
    let query = this.db.select().from(billing_cycles);

    if (filters) {
      const conditions = [];

      if (filters.planKey) {
        // Note: This requires a join or separate query to get plan_id from planKey
        // For now, filtering by planId would need to be done at service layer
      }

      if (filters.status) {
        conditions.push(eq(billing_cycles.status, filters.status));
      }

      if (filters.durationUnit) {
        conditions.push(eq(billing_cycles.duration_unit, filters.durationUnit));
      }

      if (filters.search) {
        // Drizzle handles parameterized queries automatically - no manual sanitization needed
        conditions.push(
          or(
            like(billing_cycles.display_name, `%${filters.search}%`),
            like(billing_cycles.description, `%${filters.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'displayOrder';
      const sortOrder = filters.sortOrder || 'asc';
      
      if (sortBy === 'displayName') {
        query = query.orderBy(sortOrder === 'desc' ? desc(billing_cycles.display_name) : asc(billing_cycles.display_name)) as typeof query;
      } else {
        query = query.orderBy(sortOrder === 'desc' ? desc(billing_cycles.created_at) : asc(billing_cycles.created_at)) as typeof query;
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit) as typeof query;
      }
      if (filters.offset) {
        query = query.offset(filters.offset) as typeof query;
      }
    } else {
      query = query.orderBy(asc(billing_cycles.created_at)) as typeof query;
    }

    const records = await query;
    return records.map(BillingCycleMapper.toDomain);
  }

  async findByDurationUnit(durationUnit: DurationUnit): Promise<BillingCycle[]> {
    const records = await this.db
      .select()
      .from(billing_cycles)
      .where(eq(billing_cycles.duration_unit, durationUnit))
      .orderBy(asc(billing_cycles.created_at));

    return records.map(BillingCycleMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(billing_cycles).where(eq(billing_cycles.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: billing_cycles.id })
      .from(billing_cycles)
      .where(eq(billing_cycles.id, id))
      .limit(1);
    
    return !!record;
  }
}

