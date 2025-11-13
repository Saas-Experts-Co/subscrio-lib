import { ISubscriptionRepository } from '../repositories/ISubscriptionRepository.js';
import { ICustomerRepository } from '../repositories/ICustomerRepository.js';
import { IPlanRepository } from '../repositories/IPlanRepository.js';
import { IBillingCycleRepository } from '../repositories/IBillingCycleRepository.js';
import { Subscription } from '../../domain/entities/Subscription.js';
import { generateKey } from '../../infrastructure/utils/uuid.js';
import Stripe from 'stripe';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { SubscriptionStatus } from '../../domain/value-objects/SubscriptionStatus.js';
import { now } from '../../infrastructure/utils/date.js';

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

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(
          event.data.object as Stripe.Subscription
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
    // Find customer by Stripe customer ID
    const customer = await this.customerRepository.findByExternalBillingId(
      stripeSubscription.customer as string
    );
    if (!customer) {
      throw new NotFoundError(
        `Customer not found for Stripe customer ID: ${stripeSubscription.customer}`
      );
    }

    // Find billing cycle by Stripe price ID
    const stripePriceId = stripeSubscription.items.data[0].price.id;
    const billingCycle = await this.findBillingCycleByStripePriceId(stripePriceId);
    if (!billingCycle) {
      throw new NotFoundError(
        `Billing cycle not found for Stripe price ID: ${stripePriceId}. ` +
        `Please create a billing cycle with externalProductId='${stripePriceId}'`
      );
    }

    // Find plan by metadata or manual mapping (plan needs to be determined separately)
    // For now, throwing error - implementer needs to provide plan mapping logic
    throw new NotFoundError(
      `Stripe integration requires manual plan mapping. ` +
      `Cannot automatically determine plan from Stripe price ID. ` +
      `Consider using metadata or custom mapping logic.`
    );
  }

  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    // Find existing subscription by Stripe ID
    const subscription = await this.subscriptionRepository.findByStripeId(
      stripeSubscription.id
    );
    if (!subscription) {
      // If not found, treat as creation
      return this.handleSubscriptionCreated(stripeSubscription);
    }

    // Update subscription properties
    subscription.props.currentPeriodStart = new Date(
      stripeSubscription.current_period_start * 1000
    );
    subscription.props.currentPeriodEnd = new Date(
      stripeSubscription.current_period_end * 1000
    );

    if (stripeSubscription.canceled_at) {
      subscription.props.cancellationDate = new Date(
        stripeSubscription.canceled_at * 1000
      );
    }

    subscription.props.updatedAt = now();
    
    // Sync status before saving to ensure database status matches computed status
    subscription.syncStatus();

    await this.subscriptionRepository.save(subscription);
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
    // Sync status before saving to ensure database status matches computed status
    subscription.syncStatus();
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

    // Status is now calculated dynamically, but sync to ensure database is up to date
    subscription.syncStatus();
    await this.subscriptionRepository.save(subscription);
  }

  private async handlePaymentFailed(
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

    // Suspend subscription for failed payment - status is calculated dynamically
    subscription.props.updatedAt = now();
    // Sync status before saving to ensure database status matches computed status
    subscription.syncStatus();
    await this.subscriptionRepository.save(subscription);
  }

  private async handleTrialWillEnd(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    // This is typically used for notifications
    // Could trigger email notifications or other business logic
    // Log trial ending for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Trial ending for subscription: ${stripeSubscription.id}`);
    }
  }


  /**
   * Find billing cycle by Stripe price ID (stored in externalProductId)
   */
  private async findBillingCycleByStripePriceId(stripePriceId: string): Promise<any> {
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

    // Sync status after creation to ensure stored status matches computed status
    subscription.syncStatus();

    // Save and get entity with generated ID
    const savedSubscription = await this.subscriptionRepository.save(subscription);
    return savedSubscription;
  }
}
