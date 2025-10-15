import { BillingCycle } from '../../domain/entities/BillingCycle.js';
import { BillingCycleDto } from '../dtos/BillingCycleDto.js';
import { DurationUnit } from '../../domain/value-objects/DurationUnit.js';

export class BillingCycleMapper {
  static toDto(billingCycle: BillingCycle, productKey?: string, planKey?: string): BillingCycleDto {
    return {
      productKey: productKey || '',
      planKey: planKey || '',
      key: billingCycle.key,
      displayName: billingCycle.displayName,
      description: billingCycle.props.description,
      durationValue: billingCycle.props.durationValue,
      durationUnit: billingCycle.props.durationUnit,
      externalProductId: billingCycle.props.externalProductId,
      createdAt: billingCycle.props.createdAt.toISOString(),
      updatedAt: billingCycle.props.updatedAt.toISOString()
    };
  }

  static toDomain(raw: any): BillingCycle {
    return new BillingCycle(
      {
        planId: raw.plan_id,
        key: raw.key,
        displayName: raw.display_name,
        description: raw.description,
        durationValue: raw.duration_value,
        durationUnit: raw.duration_unit as DurationUnit,
        externalProductId: raw.external_product_id,
        createdAt: new Date(raw.created_at),
        updatedAt: new Date(raw.updated_at)
      },
      raw.id
    );
  }

  static toPersistence(billingCycle: BillingCycle): any {
    return {
      id: billingCycle.id,
      plan_id: billingCycle.planId,
      key: billingCycle.key,
      display_name: billingCycle.displayName,
      description: billingCycle.props.description,
      duration_value: billingCycle.props.durationValue,
      duration_unit: billingCycle.props.durationUnit,
      external_product_id: billingCycle.props.externalProductId,
      created_at: billingCycle.props.createdAt,
      updated_at: billingCycle.props.updatedAt
    };
  }
}

