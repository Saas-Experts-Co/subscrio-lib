import { Feature } from '../entities/Feature.js';
import { Plan } from '../entities/Plan.js';
import { Subscription } from '../entities/Subscription.js';

/**
 * Domain service for resolving feature values using the hierarchy:
 * 1. Subscription Override (highest priority)
 * 2. Plan Value
 * 3. Feature Default (fallback)
 */
export class FeatureValueResolver {
  /**
   * Resolves a single feature value using the hierarchy
   */
  resolve(
    feature: Feature,
    plan: Plan | null,
    subscription: Subscription | null
  ): string {
    // STEP 1: Check subscription override
    if (subscription) {
      const override = subscription.getFeatureOverride(feature.id);
      if (override !== null) {
        return override.value;
      }
    }

    // STEP 2: Check plan value
    if (plan) {
      const planValue = plan.getFeatureValue(feature.id);
      if (planValue !== null) {
        return planValue;
      }
    }

    // STEP 3: Use feature default
    return feature.defaultValue;
  }

  /**
   * Resolves all features for a customer's subscriptions
   */
  resolveAll(
    features: Feature[],
    plans: Map<string, Plan>,
    subscriptions: Subscription[]
  ): Map<string, string> {
    const resolved = new Map<string, string>();

    for (const feature of features) {
      let value = feature.defaultValue;

      // Check all subscriptions (if multiple, highest priority wins)
      for (const subscription of subscriptions) {
        const plan = plans.get(subscription.planId);
        const resolvedValue = this.resolve(feature, plan || null, subscription);
        
        // If subscription has override, it takes precedence
        if (subscription.getFeatureOverride(feature.id)) {
          value = resolvedValue;
          break;  // Override found, stop checking
        }
        
        // Otherwise, if plan has value and we don't have one yet
        if (plan?.getFeatureValue(feature.id) && value === feature.defaultValue) {
          value = resolvedValue;
        }
      }

      resolved.set(feature.key, value);
    }

    return resolved;
  }
}

