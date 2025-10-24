import { Plan } from '../../domain/entities/Plan.js';
import { PlanFilterDto } from '../dtos/PlanDto.js';

export interface IPlanRepository {
  save(plan: Plan): Promise<void>;
  findById(id: string): Promise<Plan | null>;
  findByKey(key: string): Promise<Plan | null>;
  findByProduct(productKey: string): Promise<Plan[]>; // Uses productKey directly from database
  findByBillingCycleId(billingCycleId: string): Promise<Plan | null>;
  findAll(filters?: PlanFilterDto): Promise<Plan[]>;
  findByIds(ids: string[]): Promise<Plan[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

