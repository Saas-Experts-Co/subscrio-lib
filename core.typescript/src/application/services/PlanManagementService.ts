import { IPlanRepository } from '../repositories/IPlanRepository.js';
import { IProductRepository } from '../repositories/IProductRepository.js';
import { IFeatureRepository } from '../repositories/IFeatureRepository.js';
import { IBillingCycleRepository } from '../repositories/IBillingCycleRepository.js';
import { 
  CreatePlanDto, 
  CreatePlanDtoSchema, 
  UpdatePlanDto, 
  UpdatePlanDtoSchema,
  PlanFilterDto,
  PlanFilterDtoSchema,
  PlanDto 
} from '../dtos/PlanDto.js';
import { PlanMapper } from '../mappers/PlanMapper.js';
import { Plan } from '../../domain/entities/Plan.js';
import { PlanStatus } from '../../domain/value-objects/index.js';
import { generateId } from '../../infrastructure/utils/uuid.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  DomainError 
} from '../errors/index.js';

export class PlanManagementService {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly productRepository: IProductRepository,
    private readonly featureRepository: IFeatureRepository,
    private readonly billingCycleRepository: IBillingCycleRepository
  ) {}

  private async resolvePlanKeys(plan: Plan): Promise<{
    productKey: string;
    defaultRenewalCycleKey?: string;
    onExpireTransitionToPlanKey?: string;
  }> {
    // Plan now stores productKey directly
    const productKey = plan.productKey;

    let defaultRenewalCycleKey: string | undefined;
    if (plan.props.defaultRenewalCycleId) {
      const cycle = await this.billingCycleRepository.findById(plan.props.defaultRenewalCycleId);
      if (cycle) {
        defaultRenewalCycleKey = cycle.key;
      }
    }

    let onExpireTransitionToPlanKey: string | undefined;
    if (plan.props.onExpireTransitionToPlanId) {
      const transitionPlan = await this.planRepository.findById(plan.props.onExpireTransitionToPlanId);
      if (transitionPlan) {
        onExpireTransitionToPlanKey = transitionPlan.key;
      }
    }

    return {
      productKey,
      defaultRenewalCycleKey,
      onExpireTransitionToPlanKey
    };
  }

  async createPlan(dto: CreatePlanDto): Promise<PlanDto> {
    const validationResult = CreatePlanDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid plan data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    // Verify product exists by key
    const product = await this.productRepository.findByKey(validatedDto.productKey);
    if (!product) {
      throw new NotFoundError(`Product with key '${validatedDto.productKey}' not found`);
    }

    // Check if plan key already exists globally
    const existing = await this.planRepository.findByKey(validatedDto.key);
    if (existing) {
      throw new ConflictError(
        `Plan with key '${validatedDto.key}' already exists`
      );
    }

    // Verify default renewal cycle if provided
    let defaultRenewalCycleId: string | undefined;
    if (validatedDto.defaultRenewalCycleKey) {
      const cycle = await this.billingCycleRepository.findByKey(validatedDto.defaultRenewalCycleKey);
      if (!cycle) {
        throw new NotFoundError(
          `Renewal cycle with key '${validatedDto.defaultRenewalCycleKey}' not found`
        );
      }
      defaultRenewalCycleId = cycle.id;
    }

    // Verify transition plan if provided
    let onExpireTransitionToPlanId: string | undefined;
    if (validatedDto.onExpireTransitionToPlanKey) {
      const transitionPlan = await this.planRepository.findByKey(validatedDto.onExpireTransitionToPlanKey);
      if (!transitionPlan) {
        throw new NotFoundError(
          `Transition plan with key '${validatedDto.onExpireTransitionToPlanKey}' not found`
        );
      }
      onExpireTransitionToPlanId = transitionPlan.id;
    }

    const id = generateId();
    const plan = new Plan({
      productKey: product.key,
      key: validatedDto.key,
      displayName: validatedDto.displayName,
      description: validatedDto.description,
      status: PlanStatus.Active,
      defaultRenewalCycleId,
      onExpireTransitionToPlanId,
      featureValues: [],
      metadata: validatedDto.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }, id);

    await this.planRepository.save(plan);
    
    return PlanMapper.toDto(
      plan, 
      product.key,
      validatedDto.defaultRenewalCycleKey,
      validatedDto.onExpireTransitionToPlanKey
    );
  }

  async updatePlan(planKey: string, dto: UpdatePlanDto): Promise<PlanDto> {
    const validationResult = UpdatePlanDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid update data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    // Update properties
    if (validatedDto.displayName !== undefined) {
      plan.updateDisplayName(validatedDto.displayName);
    }
    if (validatedDto.description !== undefined) {
      plan.props.description = validatedDto.description;
    }
    if (validatedDto.defaultRenewalCycleKey !== undefined) {
      if (validatedDto.defaultRenewalCycleKey) {
        const cycle = await this.billingCycleRepository.findByKey(validatedDto.defaultRenewalCycleKey);
        if (!cycle) {
          throw new NotFoundError(
            `Renewal cycle with key '${validatedDto.defaultRenewalCycleKey}' not found`
          );
        }
        plan.props.defaultRenewalCycleId = cycle.id;
      } else {
        plan.props.defaultRenewalCycleId = undefined;
      }
    }
    if (validatedDto.onExpireTransitionToPlanKey !== undefined) {
      if (validatedDto.onExpireTransitionToPlanKey) {
        const transitionPlan = await this.planRepository.findByKey(validatedDto.onExpireTransitionToPlanKey);
        if (!transitionPlan) {
          throw new NotFoundError(
            `Transition plan with key '${validatedDto.onExpireTransitionToPlanKey}' not found`
          );
        }
        plan.props.onExpireTransitionToPlanId = transitionPlan.id;
      } else {
        plan.props.onExpireTransitionToPlanId = undefined;
      }
    }
    if (validatedDto.metadata !== undefined) {
      plan.props.metadata = validatedDto.metadata;
    }

    plan.props.updatedAt = new Date();
    await this.planRepository.save(plan);
    
    const keys = await this.resolvePlanKeys(plan);
    return PlanMapper.toDto(plan, keys.productKey, keys.defaultRenewalCycleKey, keys.onExpireTransitionToPlanKey);
  }

  async getPlan(planKey: string): Promise<PlanDto | null> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      return null;
    }

    const keys = await this.resolvePlanKeys(plan);
    return PlanMapper.toDto(plan, keys.productKey, keys.defaultRenewalCycleKey, keys.onExpireTransitionToPlanKey);
  }

  async listPlans(filters: PlanFilterDto = { limit: 50, offset: 0 }): Promise<PlanDto[]> {
    const validationResult = PlanFilterDtoSchema.safeParse(filters);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid filter parameters',
        validationResult.error.errors
      );
    }

    // Filters are already validated and use productKey
    const resolvedFilters = validationResult.data;

    const plans = await this.planRepository.findAll(resolvedFilters);
    
    // Map each plan with resolved keys
    const planDtos: PlanDto[] = [];
    for (const plan of plans) {
      const keys = await this.resolvePlanKeys(plan);
      planDtos.push(PlanMapper.toDto(plan, keys.productKey, keys.defaultRenewalCycleKey, keys.onExpireTransitionToPlanKey));
    }
    return planDtos;
  }

  async getPlansByProduct(productKey: string): Promise<PlanDto[]> {
    // Verify product exists
    const product = await this.productRepository.findByKey(productKey);
    if (!product) {
      throw new NotFoundError(`Product with key '${productKey}' not found`);
    }

    const plans = await this.planRepository.findByProduct(product.key);
    
    // Map each plan with resolved keys
    const planDtos: PlanDto[] = [];
    for (const plan of plans) {
      const keys = await this.resolvePlanKeys(plan);
      planDtos.push(PlanMapper.toDto(plan, keys.productKey, keys.defaultRenewalCycleKey, keys.onExpireTransitionToPlanKey));
    }
    return planDtos;
  }

  async archivePlan(planKey: string): Promise<void> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    plan.archive();
    await this.planRepository.save(plan);
  }

  async unarchivePlan(planKey: string): Promise<void> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    plan.unarchive();
    await this.planRepository.save(plan);
  }

  async deletePlan(planKey: string): Promise<void> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    if (!plan.canDelete()) {
      throw new DomainError(
        `Cannot delete plan with status '${plan.status}'. ` +
        'Plan must be archived before deletion.'
      );
    }

    await this.planRepository.delete(plan.id);
  }

  async setFeatureValue(planKey: string, featureKey: string, value: string): Promise<void> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    // Validate value against feature type
    this.validateFeatureValue(value, feature.props.valueType);

    plan.setFeatureValue(feature.id, value);
    await this.planRepository.save(plan);
  }

  async removeFeatureValue(planKey: string, featureKey: string): Promise<void> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    plan.removeFeatureValue(feature.id);
    await this.planRepository.save(plan);
  }

  async getFeatureValue(planKey: string, featureKey: string): Promise<string | null> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      return null;
    }

    return plan.getFeatureValue(feature.id);
  }

  async getPlanFeatures(planKey: string): Promise<Array<{ featureKey: string; value: string }>> {
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    // Map feature IDs to keys
    const features: Array<{ featureKey: string; value: string }> = [];
    for (const fv of plan.props.featureValues || []) {
      const feature = await this.featureRepository.findById(fv.featureId);
      if (feature) {
        features.push({ featureKey: feature.key, value: fv.value });
      }
    }

    return features;
  }

  private validateFeatureValue(value: string, valueType: string): void {
    switch (valueType) {
      case 'toggle':
        if (!['true', 'false'].includes(value.toLowerCase())) {
          throw new ValidationError('Toggle features must have value "true" or "false"');
        }
        break;
      case 'numeric':
        const num = Number(value);
        if (isNaN(num) || !isFinite(num)) {
          throw new ValidationError('Numeric features must have a valid number value');
        }
        break;
      case 'text':
        // Text features accept any string value
        break;
      default:
        throw new ValidationError(`Unknown feature value type: ${valueType}`);
    }
  }
}
