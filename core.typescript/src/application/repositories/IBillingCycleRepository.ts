import { BillingCycle } from '../../domain/entities/BillingCycle.js';
import { BillingCycleFilterDto } from '../dtos/BillingCycleDto.js';

export interface IBillingCycleRepository {
  save(billingCycle: BillingCycle): Promise<void>;
  findById(id: string): Promise<BillingCycle | null>;
  findByKey(key: string, planId?: string): Promise<BillingCycle | null>;
  findByPlan(planId: string): Promise<BillingCycle[]>;
  findAll(filters?: BillingCycleFilterDto): Promise<BillingCycle[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

