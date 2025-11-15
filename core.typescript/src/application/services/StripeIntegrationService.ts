import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository.js';
import { ICustomerRepository } from '../repositories/ICustomerRepository.js';
import { IPlanRepository } from '../repositories/IPlanRepository.js';
import { IBillingCycleRepository } from '../repositories/IBillingCycleRepository.js';
import { Subscription } from '../../domain/entities/Subscription.js';
import { BillingCycle } from '../../domain/entities/BillingCycle.js';
import { Plan } from '../../domain/entities/Plan.js';
import { Customer } from '../../domain/entities/Customer.js';
import { generateKey } from '../../infrastructure/utils/uuid.js';
import Stripe from 'stripe';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { SubscriptionStatus } from '../../domain/value-objects/SubscriptionStatus.js';
import { now } from '../../infrastructure/utils/date.js';

const SUBSCRIO_CUSTOMER_KEY_METADATA_KEYS = ['subscrioCustomerKey', 'subscrio_customer_key'];
const SUBSCRIO_SUBSCRIPTION_KEY_METADATA_KEYS = ['subscrioSubscriptionKey', 'subscrio_subscription_key'];

export class StripeIntegrationService {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly planRepository: IPlanRepository,
    private readonly billingCycleRepository: IBillingCycleRepository
  ) {}

  /**
   * Process a verified Stripe event
   * NOTE: Signature verification MUST be done by implementor before calling this
   */
  async processStripeEvent(event: Stripe.Event): Promise<void> {
    // Event is already verified - process based on type
    switch (event.type) {
      case 'customer.created':
      case 'customer.updated':
        await this.handleCustomerUpsert(event.data.object as Stripe.Customer);
        break;

      case 'customer.deleted':
        await this.handleCustomerDeleted(event.data.object as Stripe.Customer | Stripe.DeletedCustomer);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        // Ignore unhandled event types
        // Log unhandled event types for debugging (remove in production)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Unhandled Stripe event type: ${event.type}`);
        }
    }
  }

  private async handleSubscriptionCreated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const stripeCustomerId = this.extractCustomerId(stripeSubscription.customer);
    const customer = await this.resolveCustomer(
      stripeCustomerId,
      stripeSubscription.metadata
    );

    const { billingCycle, plan } = await this.resolvePlanFromSubscription(stripeSubscription);

    const existing = await this.subscriptionRepository.findByStripeId(stripeSubscription.id);
    if (existing) {
      this.applyStripeSubscriptionFields(existing, customer.id!, plan.id!, billingCycle.id!, stripeSubscription);
      await this.subscriptionRepository.save(existing);
      return;
    }

    const subscriptionKey =
      this.getMetadataValue(stripeSubscription.metadata, SUBSCRIO_SUBSCRIPTION_KEY_METADATA_KEYS) ??
      generateKey('sub');

    const activationDate = new Date(stripeSubscription.created * 1000);
    const currentPeriodStart = this.toDateOrDefault(stripeSubscription.current_period_start, activationDate);
    const currentPeriodEnd = this.toDateOrUndefined(stripeSubscription.current_period_end) ??
      billingCycle.calculateNextPeriodEnd(currentPeriodStart) ??
      undefined;

    const subscription = new Subscription({
      key: subscriptionKey,
      customerId: customer.id!,
      planId: plan.id!,
      billingCycleId: billingCycle.id!,
      status: this.mapStripeStatus(stripeSubscription.status),
      isArchived: false,
      activationDate,
      expirationDate: undefined,
      cancellationDate: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : undefined,
      trialEndDate: this.toDateOrUndefined(stripeSubscription.trial_end),
      currentPeriodStart,
      currentPeriodEnd,
      stripeSubscriptionId: stripeSubscription.id,
      featureOverrides: [],
      metadata: stripeSubscription.metadata ? { ...stripeSubscription.metadata } : undefined,
      createdAt: now(),
      updatedAt: now()
    });

    await this.subscriptionRepository.save(subscription);
  }

  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const existing = await this.subscriptionRepository.findByStripeId(
      stripeSubscription.id
    );
    if (!existing) {
      // If not found, treat as creation
      return this.handleSubscriptionCreated(stripeSubscription);
    }

    const stripeCustomerId = this.extractCustomerId(stripeSubscription.customer);
    const customer = await this.resolveCustomer(
      stripeCustomerId,
      stripeSubscription.metadata
    );

    const { billingCycle, plan } = await this.resolvePlanFromSubscription(stripeSubscription);
    this.applyStripeSubscriptionFields(existing, customer.id!, plan.id!, billingCycle.id!, stripeSubscription);
    await this.subscriptionRepository.save(existing);
  }

  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findByStripeId(
      stripeSubscription.id
    );
    if (!subscription) {
      return; // Already deleted or never existed
    }

    subscription.expire();
    await this.subscriptionRepository.save(subscription);
  }

  private async handlePaymentSucceeded(
    stripeInvoice: Stripe.Invoice
  ): Promise<void> {
    if (!stripeInvoice.subscription) {
      return; // Not a subscription invoice
    }

    const subscription = await this.subscriptionRepository.findByStripeId(
      stripeInvoice.subscription as string
    );
    if (!subscription) {
      return; // Subscription not found
    }

    const period = stripeInvoice.lines?.data?.[0]?.period;
    if (period) {
      subscription.props.currentPeriodStart = this.toDateOrDefault(period.start, subscription.props.currentPeriodStart ?? now());
      subscription.props.currentPeriodEnd = this.toDateOrUndefined(period.end);
    }

    subscription.props.updatedAt = now();
    await this.subscriptionRepository.save(subscription);
  }

  /**
   * Find billing cycle by Stripe price ID (stored in externalProductId)
   */
  private async findBillingCycleByStripePriceId(stripePriceId: string): Promise<BillingCycle | null> {
    // Search all billing cycles for one with matching externalProductId
    const allCycles = await this.billingCycleRepository.findAll();
    return allCycles.find(cycle => cycle.props.externalProductId === stripePriceId) || null;
  }

  /**
   * Create Stripe subscription from Subscrio data
   */
  async createStripeSubscription(
    customerKey: string,
    planKey: string,
    billingCycleKey: string,
    _stripePriceId: string
  ): Promise<Subscription> {
    // Find customer
    const customer = await this.customerRepository.findByKey(customerKey);
    if (!customer) {
      throw new NotFoundError(`Customer with key '${customerKey}' not found`);
    }

    if (!customer.externalBillingId) {
      throw new ValidationError('Customer must have external billing ID for Stripe integration');
    }

    // Find plan
    const plan = await this.planRepository.findByKey(planKey);
    if (!plan) {
      throw new NotFoundError(`Plan with key '${planKey}' not found`);
    }

    // Find billing cycle
    const billingCycle = await this.billingCycleRepository.findByKey(billingCycleKey);
    if (!billingCycle) {
      throw new NotFoundError(`Billing cycle with key '${billingCycleKey}' not found`);
    }

    // Entities from repository always have IDs (BIGSERIAL PRIMARY KEY)
    // This would integrate with Stripe SDK to create the subscription
    // For now, creating a placeholder subscription
    // Create domain entity (no ID - database will generate)
    const subscription = new Subscription({
      key: generateKey('sub'),  // Auto-generate key for Stripe subscriptions
      customerId: customer.id!,
      planId: plan.id!,
      billingCycleId: billingCycle.id!,
      status: SubscriptionStatus.Active,  // Default status
      isArchived: false,
      activationDate: now(),
      currentPeriodStart: now(),
      currentPeriodEnd: billingCycle.calculateNextPeriodEnd(now()) ?? undefined,
      stripeSubscriptionId: `sub_placeholder_${Date.now()}`,
      featureOverrides: [],
      createdAt: now(),
      updatedAt: now()
    });

    // Save and get entity with generated ID
    const savedSubscription = await this.subscriptionRepository.save(subscription);
    return savedSubscription;
  }

  private async resolveCustomer(
    stripeCustomerId: string,
    metadata?: Stripe.Metadata | null
  ): Promise<Customer> {
    const existing = await this.customerRepository.findByExternalBillingId(stripeCustomerId);
    if (existing) {
      return existing;
    }

    const customerKey = this.getMetadataValue(metadata, SUBSCRIO_CUSTOMER_KEY_METADATA_KEYS);
    if (!customerKey) {
      throw new NotFoundError(
        `Customer not found for Stripe customer ID '${stripeCustomerId}'. ` +
        `Provide 'subscrioCustomerKey' metadata when creating Stripe customers or subscriptions.`
      );
    }

    const fallbackCustomer = await this.customerRepository.findByKey(customerKey);
    if (!fallbackCustomer) {
      throw new NotFoundError(
        `Customer with key '${customerKey}' not found while handling Stripe customer '${stripeCustomerId}'.`
      );
    }

    fallbackCustomer.setExternalBillingId(stripeCustomerId);
    return await this.customerRepository.save(fallbackCustomer);
  }

  private getMetadataValue(
    metadata: Stripe.Metadata | null | undefined,
    keys: string[]
  ): string | null {
    if (!metadata) {
      return null;
    }

    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private extractCustomerId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer
  ): string {
    if (typeof customer === 'string') {
      return customer;
    }

    return customer.id;
  }

  private async resolvePlanFromSubscription(stripeSubscription: Stripe.Subscription): Promise<{
    billingCycle: BillingCycle;
    plan: Plan;
  }> {
    const firstItem = stripeSubscription.items.data[0];
    if (!firstItem || !firstItem.price || !firstItem.price.id) {
      throw new ValidationError('Stripe subscription payload is missing price information');
    }

    const stripePriceId = firstItem.price.id;
    const billingCycle = await this.findBillingCycleByStripePriceId(stripePriceId);
    if (!billingCycle) {
      throw new NotFoundError(
        `Billing cycle not found for Stripe price ID '${stripePriceId}'. ` +
        `Create a billing cycle with externalProductId='${stripePriceId}' to complete the mapping.`
      );
    }

    const plan = await this.planRepository.findById(billingCycle.props.planId);
    if (!plan || plan.id === undefined) {
      throw new NotFoundError(`Plan not found for billing cycle '${billingCycle.key}'`);
    }

    return { billingCycle, plan };
  }

  private applyStripeSubscriptionFields(
    subscription: Subscription,
    customerId: number,
    planId: number,
    billingCycleId: number,
    stripeSubscription: Stripe.Subscription
  ) {
    subscription.props.customerId = customerId;
    subscription.props.planId = planId;
    subscription.props.billingCycleId = billingCycleId;
    subscription.props.activationDate = subscription.props.activationDate ?? new Date(stripeSubscription.created * 1000);
    subscription.props.currentPeriodStart = this.toDateOrDefault(
      stripeSubscription.current_period_start,
      subscription.props.currentPeriodStart ?? now()
    );
    subscription.props.currentPeriodEnd = this.toDateOrUndefined(
      stripeSubscription.current_period_end
    );
    subscription.props.trialEndDate = this.toDateOrUndefined(stripeSubscription.trial_end);
    subscription.props.cancellationDate = stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : stripeSubscription.cancel_at_period_end
        ? subscription.props.cancellationDate
        : undefined;
    subscription.props.stripeSubscriptionId = stripeSubscription.id;
    subscription.props.metadata = stripeSubscription.metadata ? { ...stripeSubscription.metadata } : subscription.props.metadata;
    subscription.props.status = this.mapStripeStatus(stripeSubscription.status);
    subscription.props.updatedAt = now();
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.Active;
      case 'trialing':
        return SubscriptionStatus.Trial;
      case 'canceled':
        return SubscriptionStatus.Cancelled;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.CancellationPending;
      case 'incomplete':
        return SubscriptionStatus.Pending;
      case 'incomplete_expired':
        return SubscriptionStatus.Expired;
      default:
        return SubscriptionStatus.Active;
    }
  }

  private toDateOrUndefined(timestamp?: number | null): Date | undefined {
    if (!timestamp) {
      return undefined;
    }

    return new Date(timestamp * 1000);
  }

  private toDateOrDefault(timestamp: number | null | undefined, fallback: Date): Date {
    if (!timestamp) {
      return fallback;
    }

    return new Date(timestamp * 1000);
  }

  private async handleCustomerUpsert(
    stripeCustomer: Stripe.Customer
  ): Promise<void> {
    await this.resolveCustomer(stripeCustomer.id, stripeCustomer.metadata);
  }

  private async handleCustomerDeleted(
    stripeCustomer: Stripe.Customer | Stripe.DeletedCustomer
  ): Promise<void> {
    const existing = await this.customerRepository.findByExternalBillingId(stripeCustomer.id);
    if (!existing) {
      return;
    }

    existing.setExternalBillingId(undefined);
    await this.customerRepository.save(existing);
  }
}
