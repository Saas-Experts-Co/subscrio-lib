import { IBillingCycleRepository } from '../repositories/IBillingCycleRepository.js';
import { IPlanRepository } from '../repositories/IPlanRepository.js';
import { 
  CreateBillingCycleDto, 
  CreateBillingCycleDtoSchema, 
  UpdateBillingCycleDto, 
  UpdateBillingCycleDtoSchema,
  BillingCycleFilterDto,
  BillingCycleFilterDtoSchema,
  BillingCycleDto 
} from '../dtos/BillingCycleDto.js';
import { BillingCycleMapper } from '../mappers/BillingCycleMapper.js';
import { BillingCycle } from '../../domain/entities/BillingCycle.js';
import { DurationUnit } from '../../domain/value-objects/index.js';
import { generateId } from '../../infrastructure/utils/uuid.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  DomainError 
} from '../errors/index.js';

export class BillingCycleManagementService {
  constructor(
    private readonly billingCycleRepository: IBillingCycleRepository,
    private readonly planRepository: IPlanRepository
  ) {}

  async createBillingCycle(dto: CreateBillingCycleDto): Promise<BillingCycleDto> {
    const validationResult = CreateBillingCycleDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid billing cycle data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    // Verify plan exists
    const plan = await this.planRepository.findByKey(validatedDto.productKey, validatedDto.planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${validatedDto.planKey}' not found in product '${validatedDto.productKey}'`);
    }

    // Check if key already exists for this plan
    const existing = await this.billingCycleRepository.findByKey(validatedDto.key, plan.id);
    if (existing) {
      throw new ConflictError(`Billing cycle with key '${validatedDto.key}' already exists for this plan`);
    }

    // Validate duration unit
    if (!Object.values(DurationUnit).includes(validatedDto.durationUnit as DurationUnit)) {
      throw new ValidationError(`Invalid duration unit: ${validatedDto.durationUnit}`);
    }

    // Validate duration value
    if (validatedDto.durationValue <= 0) {
      throw new ValidationError('Duration value must be greater than 0');
    }

    const id = generateId();
    const billingCycle = new BillingCycle({
      planId: plan.id,
      key: validatedDto.key,
      displayName: validatedDto.displayName,
      description: validatedDto.description,
      durationValue: validatedDto.durationValue,
      durationUnit: validatedDto.durationUnit as DurationUnit,
      externalProductId: validatedDto.externalProductId,
      createdAt: new Date(),
      updatedAt: new Date()
    }, id);

    await this.billingCycleRepository.save(billingCycle);
    return BillingCycleMapper.toDto(billingCycle, validatedDto.productKey, validatedDto.planKey);
  }

  async updateBillingCycle(productKey: string, planKey: string, key: string, dto: UpdateBillingCycleDto): Promise<BillingCycleDto> {
    const validationResult = UpdateBillingCycleDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid update data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    // Verify plan exists
    const plan = await this.planRepository.findByKey(productKey, planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found in product '${productKey}'`);
    }

    const billingCycle = await this.billingCycleRepository.findByKey(key, plan.id);
    if (!billingCycle) {
      throw new NotFoundError(`Billing cycle with key '${key}' not found for this plan`);
    }

    // Update properties
    if (validatedDto.displayName !== undefined) {
      billingCycle.props.displayName = validatedDto.displayName;
    }
    if (validatedDto.description !== undefined) {
      billingCycle.props.description = validatedDto.description;
    }
    if (validatedDto.durationValue !== undefined) {
      if (validatedDto.durationValue <= 0) {
        throw new ValidationError('Duration value must be greater than 0');
      }
      billingCycle.props.durationValue = validatedDto.durationValue;
    }
    if (validatedDto.durationUnit !== undefined) {
      if (!Object.values(DurationUnit).includes(validatedDto.durationUnit as DurationUnit)) {
        throw new ValidationError(`Invalid duration unit: ${validatedDto.durationUnit}`);
      }
      billingCycle.props.durationUnit = validatedDto.durationUnit as DurationUnit;
    }
    if (validatedDto.externalProductId !== undefined) {
      billingCycle.props.externalProductId = validatedDto.externalProductId;
    }

    billingCycle.props.updatedAt = new Date();
    await this.billingCycleRepository.save(billingCycle);
    return BillingCycleMapper.toDto(billingCycle, productKey, planKey);
  }

  async getBillingCycle(productKey: string, planKey: string, key: string): Promise<BillingCycleDto | null> {
    // Verify plan exists
    const plan = await this.planRepository.findByKey(productKey, planKey);
    if (!plan) {
      return null;
    }

    const billingCycle = await this.billingCycleRepository.findByKey(key, plan.id);
    return billingCycle ? BillingCycleMapper.toDto(billingCycle, productKey, planKey) : null;
  }

  async getBillingCyclesByPlan(productKey: string, planKey: string): Promise<BillingCycleDto[]> {
    // Verify plan exists
    const plan = await this.planRepository.findByKey(productKey, planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found in product '${productKey}'`);
    }

    const billingCycles = await this.billingCycleRepository.findByPlan(plan.id);
    return billingCycles.map(bc => BillingCycleMapper.toDto(bc, productKey, planKey));
  }

  async listBillingCycles(filters: BillingCycleFilterDto = { limit: 50, offset: 0 }): Promise<BillingCycleDto[]> {
    const validationResult = BillingCycleFilterDtoSchema.safeParse(filters);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid filter parameters',
        validationResult.error.errors
      );
    }

    // If filtering by plan, get plan first
    if (validationResult.data.productKey && validationResult.data.planKey) {
      return this.getBillingCyclesByPlan(
        validationResult.data.productKey, 
        validationResult.data.planKey
      );
    }

    // Otherwise list all (need to resolve productKey/planKey for each)
    const billingCycles = await this.billingCycleRepository.findAll(validationResult.data);
    const dtos: BillingCycleDto[] = [];
    
    for (const bc of billingCycles) {
      const plan = await this.planRepository.findById(bc.planId);
      if (plan) {
        dtos.push(BillingCycleMapper.toDto(bc, plan.productKey, plan.key));
      }
    }
    
    return dtos;
  }

  async deleteBillingCycle(productKey: string, planKey: string, key: string): Promise<void> {
    // Verify plan exists
    const plan = await this.planRepository.findByKey(productKey, planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found in product '${productKey}'`);
    }

    const billingCycle = await this.billingCycleRepository.findByKey(key, plan.id);
    if (!billingCycle) {
      throw new NotFoundError(`Billing cycle with key '${key}' not found for this plan`);
    }

    if (!billingCycle.canDelete()) {
      throw new DomainError(
        'Cannot delete billing cycle that is being used by plans'
      );
    }

    await this.billingCycleRepository.delete(billingCycle.id);
  }

  /**
   * Calculate next period end date based on billing cycle
   */
  calculateNextPeriodEnd(
    billingCycleId: string, 
    currentPeriodEnd: Date
  ): Promise<Date> {
    return this.billingCycleRepository.findById(billingCycleId)
      .then(billingCycle => {
        if (!billingCycle) {
          throw new NotFoundError(`Billing cycle with id '${billingCycleId}' not found`);
        }
        return billingCycle.calculateNextPeriodEnd(currentPeriodEnd);
      });
  }

  /**
   * Get billing cycles by duration unit
   */
  async getBillingCyclesByDurationUnit(durationUnit: DurationUnit): Promise<BillingCycleDto[]> {
    const allCycles = await this.billingCycleRepository.findAll();
    const filtered = allCycles.filter(cycle => cycle.props.durationUnit === durationUnit);
    return filtered.map(cycle => BillingCycleMapper.toDto(cycle));
  }

  /**
   * Get default billing cycles (commonly used ones)
   */
  async getDefaultBillingCycles(): Promise<BillingCycleDto[]> {
    const commonCycles = [
      { key: 'monthly', durationValue: 1, durationUnit: DurationUnit.Months },
      { key: 'quarterly', durationValue: 3, durationUnit: DurationUnit.Months },
      { key: 'yearly', durationValue: 1, durationUnit: DurationUnit.Years }
    ];

    const cycles: BillingCycleDto[] = [];

    for (const cycle of commonCycles) {
      const existing = await this.billingCycleRepository.findByKey(cycle.key);
      if (existing) {
        cycles.push(BillingCycleMapper.toDto(existing));
      }
    }

    return cycles;
  }
}

