import { Subscription } from '../../domain/entities/Subscription.js';
import { SubscriptionFilterDto } from '../dtos/SubscriptionDto.js';

export interface ISubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findById(id: string): Promise<Subscription | null>;
  findByKey(key: string): Promise<Subscription | null>;
  findByCustomerId(customerId: string, filters?: SubscriptionFilterDto): Promise<Subscription[]>;
  findByStripeId(stripeSubscriptionId: string): Promise<Subscription | null>;
  findAll(filters?: SubscriptionFilterDto): Promise<Subscription[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  
  // Find active subscription for customer and plan combination
  findActiveByCustomerAndPlan(customerId: string, planId: string): Promise<Subscription | null>;
}

