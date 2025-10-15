import { Plan, PlanFeatureValue } from '../../domain/entities/Plan.js';
import { PlanDto } from '../dtos/PlanDto.js';
import { PlanStatus } from '../../domain/value-objects/PlanStatus.js';

export class PlanMapper {
  static toDto(
    plan: Plan, 
    productKey: string,
    defaultRenewalCycleKey?: string,
    onExpireTransitionToPlanKey?: string
  ): PlanDto {
    return {
      productKey,
      key: plan.key,
      displayName: plan.displayName,
      description: plan.props.description,
      status: plan.status,
      defaultRenewalCycleKey,
      onExpireTransitionToPlanKey,
      metadata: plan.props.metadata,
      createdAt: plan.props.createdAt.toISOString(),
      updatedAt: plan.props.updatedAt.toISOString()
    };
  }

  static toDomain(raw: any, featureValues: PlanFeatureValue[] = []): Plan {
    return new Plan(
      {
        productKey: raw.product_key,
        key: raw.key,
        displayName: raw.display_name,
        description: raw.description,
        status: raw.status as PlanStatus,
        defaultRenewalCycleId: raw.default_renewal_cycle_id,
        onExpireTransitionToPlanId: raw.on_expire_transition_to_plan_id,
        featureValues,
        metadata: raw.metadata,
        createdAt: new Date(raw.created_at),
        updatedAt: new Date(raw.updated_at)
      },
      raw.id
    );
  }

  static toPersistence(plan: Plan): any {
    return {
      id: plan.id,
      product_key: plan.productKey,
      key: plan.key,
      display_name: plan.displayName,
      description: plan.props.description,
      status: plan.status,
      default_renewal_cycle_id: plan.props.defaultRenewalCycleId,
      on_expire_transition_to_plan_id: plan.props.onExpireTransitionToPlanId,
      metadata: plan.props.metadata,
      created_at: plan.props.createdAt,
      updated_at: plan.props.updatedAt
    };
  }
}

