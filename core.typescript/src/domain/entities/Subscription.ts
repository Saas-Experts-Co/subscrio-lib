import { Entity } from '../base/Entity.js';
import { SubscriptionStatus } from '../value-objects/SubscriptionStatus.js';
import { OverrideType } from '../value-objects/OverrideType.js';
import { DomainError } from '../../application/errors/index.js';
import { now } from '../../infrastructure/utils/date.js';

export interface FeatureOverride {
  featureId: string;
  value: string;
  type: OverrideType;
  createdAt: Date;
}

export interface SubscriptionProps {
  key: string;  // External reference key for this subscription
  customerId: string;
  planId: string;
  billingCycleId: string;
  status: SubscriptionStatus;
  activationDate?: Date;
  expirationDate?: Date;
  cancellationDate?: Date;
  trialEndDate?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date | null;
  stripeSubscriptionId?: string;
  featureOverrides: FeatureOverride[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Subscription extends Entity<SubscriptionProps> {
  get key(): string {
    return this.props.key;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get planId(): string {
    return this.props.planId;
  }

  get status(): SubscriptionStatus {
    const currentTime = now();
    
    // If cancellation is set, check if it's immediate or pending
    if (this.props.cancellationDate) {
      // If cancellation date is in the future, it's pending
      if (this.props.cancellationDate > currentTime) {
        return SubscriptionStatus.CancellationPending;
      }
      // If cancellation date is in the past, it's cancelled
      return SubscriptionStatus.Cancelled;
    }
    
    // If expired, return expired
    if (this.props.expirationDate && this.props.expirationDate <= currentTime) {
      return SubscriptionStatus.Expired;
    }
    
    // If in trial period, return trial
    if (this.props.trialEndDate && this.props.trialEndDate > currentTime) {
      return SubscriptionStatus.Trial;
    }
    
    // If trial ended but not yet active, return active
    if (this.props.trialEndDate && this.props.trialEndDate <= currentTime) {
      return SubscriptionStatus.Active;
    }
    
    // Default to active if no trial period
    return SubscriptionStatus.Active;
  }

  activate(): void {
    this.props.activationDate = this.props.activationDate || new Date();
    this.props.trialEndDate = undefined; // Clear trial end date when activating
    this.props.updatedAt = now();
  }

  cancel(): void {
    if (this.status === SubscriptionStatus.Cancelled) {
      throw new DomainError('Subscription is already cancelled. Current status: ' + this.status);
    }
    this.props.cancellationDate = now();
    this.props.updatedAt = now();
  }

  renew(): void {
    // Clear temporary overrides on renewal
    this.clearTemporaryOverrides();
    this.props.updatedAt = now();
  }

  expire(): void {
    this.props.expirationDate = now();
    this.props.updatedAt = now();
  }

  archive(): void {
    this.props.expirationDate = now();
    this.props.updatedAt = now();
  }

  unarchive(): void {
    this.props.expirationDate = undefined;
    this.props.updatedAt = now();
  }

  setExpirationDate(date: Date): void {
    this.props.expirationDate = date;
    this.props.updatedAt = now();
  }

  setActivationDate(date: Date): void {
    this.props.activationDate = date;
    this.props.updatedAt = now();
  }

  setTrialEndDate(date: Date | null): void {
    this.props.trialEndDate = date ?? undefined;
    this.props.updatedAt = now();
  }

  setCurrentPeriod(start: Date, end: Date): void {
    this.props.currentPeriodStart = start;
    this.props.currentPeriodEnd = end;
    this.props.updatedAt = now();
  }

  addFeatureOverride(featureId: string, value: string, type: OverrideType): void {
    // Remove existing override if present
    this.removeFeatureOverride(featureId);
    
    this.props.featureOverrides.push({
      featureId,
      value,
      type,
      createdAt: now()
    });
    this.props.updatedAt = now();
  }

  removeFeatureOverride(featureId: string): void {
    this.props.featureOverrides = this.props.featureOverrides.filter(
      o => o.featureId !== featureId
    );
    this.props.updatedAt = now();
  }

  getFeatureOverride(featureId: string): FeatureOverride | null {
    return this.props.featureOverrides.find(o => o.featureId === featureId) || null;
  }

  clearTemporaryOverrides(): void {
    this.props.featureOverrides = this.props.featureOverrides.filter(
      o => o.type === OverrideType.Permanent
    );
    this.props.updatedAt = now();
  }

  canDelete(): boolean {
    return this.status === SubscriptionStatus.Expired;
  }
}

