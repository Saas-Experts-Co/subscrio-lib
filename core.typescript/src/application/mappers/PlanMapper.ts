import { Plan, PlanFeatureValue } from '../../domain/entities/Plan.js';
import { PlanDto } from '../dtos/PlanDto.js';
import { PlanStatus } from '../../domain/value-objects/PlanStatus.js';

export class PlanMapper {
  static toDto(
    plan: Plan, 
    productKey: string,
    onExpireTransitionToBillingCycleKey?: string
  ): PlanDto {
    return {
      productKey,
      key: plan.key,
      displayName: plan.displayName,
      description: plan.props.description ?? null,
      status: plan.status,
      onExpireTransitionToBillingCycleKey: onExpireTransitionToBillingCycleKey ?? null,
      metadata: plan.props.metadata ?? null,
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
        onExpireTransitionToBillingCycleKey: raw.on_expire_transition_to_billing_cycle_key,
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
      on_expire_transition_to_billing_cycle_key: plan.props.onExpireTransitionToBillingCycleKey,
      metadata: plan.props.metadata,
      created_at: plan.props.createdAt,
      updated_at: plan.props.updatedAt
    };
  }
}

