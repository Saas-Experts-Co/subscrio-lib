import { Subscription, FeatureOverride } from '../../domain/entities/Subscription.js';
import { SubscriptionDto } from '../dtos/SubscriptionDto.js';
import { SubscriptionStatus } from '../../domain/value-objects/SubscriptionStatus.js';

export class SubscriptionMapper {
  static toDto(
    subscription: Subscription,
    customerKey: string,
    productKey: string,
    planKey: string,
    billingCycleKey: string
  ): SubscriptionDto {
    return {
      key: subscription.key,
      customerKey,
      productKey,
      planKey,
      billingCycleKey,
      status: subscription.status,
      activationDate: subscription.props.activationDate?.toISOString(),
      expirationDate: subscription.props.expirationDate?.toISOString(),
      cancellationDate: subscription.props.cancellationDate?.toISOString(),
      trialEndDate: subscription.props.trialEndDate?.toISOString(),
      currentPeriodStart: subscription.props.currentPeriodStart?.toISOString(),
      currentPeriodEnd: subscription.props.currentPeriodEnd?.toISOString(),
      autoRenew: subscription.props.autoRenew,
      stripeSubscriptionId: subscription.props.stripeSubscriptionId,
      metadata: subscription.props.metadata,
      createdAt: subscription.props.createdAt.toISOString(),
      updatedAt: subscription.props.updatedAt.toISOString()
    };
  }

  static toDomain(raw: any, featureOverrides: FeatureOverride[] = []): Subscription {
    return new Subscription(
      {
        key: raw.key,
        customerId: raw.customer_id,
        planId: raw.plan_id,
        billingCycleId: raw.billing_cycle_id,
        status: raw.status as SubscriptionStatus,
        activationDate: raw.activation_date ? new Date(raw.activation_date) : undefined,
        expirationDate: raw.expiration_date ? new Date(raw.expiration_date) : undefined,
        cancellationDate: raw.cancellation_date ? new Date(raw.cancellation_date) : undefined,
        trialEndDate: raw.trial_end_date ? new Date(raw.trial_end_date) : undefined,
        currentPeriodStart: raw.current_period_start ? new Date(raw.current_period_start) : undefined,
        currentPeriodEnd: raw.current_period_end ? new Date(raw.current_period_end) : undefined,
        autoRenew: raw.auto_renew,
        stripeSubscriptionId: raw.stripe_subscription_id,
        featureOverrides,
        metadata: raw.metadata,
        createdAt: new Date(raw.created_at),
        updatedAt: new Date(raw.updated_at)
      },
      raw.id
    );
  }

  static toPersistence(subscription: Subscription): any {
    return {
      id: subscription.id,
      key: subscription.key,
      customer_id: subscription.customerId,
      plan_id: subscription.planId,
      billing_cycle_id: subscription.props.billingCycleId,
      status: subscription.status,
      activation_date: subscription.props.activationDate,
      expiration_date: subscription.props.expirationDate,
      cancellation_date: subscription.props.cancellationDate,
      trial_end_date: subscription.props.trialEndDate ?? null,
      current_period_start: subscription.props.currentPeriodStart,
      current_period_end: subscription.props.currentPeriodEnd,
      auto_renew: subscription.props.autoRenew,
      stripe_subscription_id: subscription.props.stripeSubscriptionId,
      metadata: subscription.props.metadata,
      created_at: subscription.props.createdAt,
      updated_at: subscription.props.updatedAt
    };
  }
}

