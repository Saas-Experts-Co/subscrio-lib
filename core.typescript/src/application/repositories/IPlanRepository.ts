import { Plan } from '../../domain/entities/Plan.js';
import { PlanFilterDto } from '../dtos/PlanDto.js';

export interface IPlanRepository {
  save(plan: Plan): Promise<void>;
  findById(id: string): Promise<Plan | null>;
  findByKey(productKey: string, key: string): Promise<Plan | null>;
  findByProduct(productKey: string): Promise<Plan[]>; // Uses productKey directly from database
  findAll(filters?: PlanFilterDto): Promise<Plan[]>;
  findByIds(ids: string[]): Promise<Plan[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

