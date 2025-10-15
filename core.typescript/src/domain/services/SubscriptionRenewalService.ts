import { Subscription } from '../entities/Subscription.js';
import { BillingCycle } from '../entities/BillingCycle.js';

/**
 * Domain service for managing subscription renewals and plan transitions
 */
export class SubscriptionRenewalService {
  /**
   * Process renewal for a subscription
   * Clears temporary overrides and updates period dates
   */
  processRenewal(subscription: Subscription, billingCycle: BillingCycle): void {
    // Clear temporary overrides
    subscription.clearTemporaryOverrides();
    
    // Update period dates
    const now = new Date();
    subscription.props.currentPeriodStart = now;
    subscription.props.currentPeriodEnd = billingCycle.calculateNextPeriodEnd(now);
    
    // Renew the subscription (changes status if needed)
    subscription.renew();
  }

  /**
   * Create a new subscription for plan transition on expiry
   * Returns the properties for the new subscription
   */
  createTransitionSubscription(
    expiredSubscription: Subscription,
    targetPlanId: string
  ): Partial<Subscription['props']> {
    const now = new Date();
    
    return {
      customerId: expiredSubscription.customerId,
      planId: targetPlanId,
      billingCycleId: expiredSubscription.props.billingCycleId,
      activationDate: now,
      currentPeriodStart: now,
      autoRenew: expiredSubscription.props.autoRenew,
      featureOverrides: [], // Overrides do NOT carry over
      createdAt: now,
      updatedAt: now
    };
  }
}

