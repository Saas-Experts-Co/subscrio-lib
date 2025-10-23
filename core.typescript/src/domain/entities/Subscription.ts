import { Entity } from '../base/Entity.js';
import { SubscriptionStatus } from '../value-objects/SubscriptionStatus.js';
import { OverrideType } from '../value-objects/OverrideType.js';

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
  currentPeriodEnd?: Date;
  autoRenew: boolean;
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
    const now = new Date();
    
    // If cancelled, return cancelled
    if (this.props.cancellationDate && this.props.cancellationDate <= now) {
      return SubscriptionStatus.Cancelled;
    }
    
    // If expired, return expired
    if (this.props.expirationDate && this.props.expirationDate <= now) {
      return SubscriptionStatus.Expired;
    }
    
    // If in trial period, return trial
    if (this.props.trialEndDate && this.props.trialEndDate > now) {
      return SubscriptionStatus.Trial;
    }
    
    // If trial ended but not yet active, return active
    if (this.props.trialEndDate && this.props.trialEndDate <= now) {
      return SubscriptionStatus.Active;
    }
    
    // Default to active if no trial period
    return SubscriptionStatus.Active;
  }

  activate(): void {
    this.props.activationDate = this.props.activationDate || new Date();
    this.props.trialEndDate = undefined; // Clear trial end date when activating
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.status === SubscriptionStatus.Cancelled) {
      throw new Error('Subscription is already cancelled');
    }
    this.props.cancellationDate = new Date();
    this.props.updatedAt = new Date();
  }

  renew(): void {
    // Clear temporary overrides on renewal
    this.clearTemporaryOverrides();
    this.props.updatedAt = new Date();
  }

  expire(): void {
    this.props.expirationDate = new Date();
    this.props.updatedAt = new Date();
  }

  archive(): void {
    this.props.expirationDate = new Date();
    this.props.updatedAt = new Date();
  }

  unarchive(): void {
    this.props.expirationDate = undefined;
    this.props.updatedAt = new Date();
  }

  setExpirationDate(date: Date): void {
    this.props.expirationDate = date;
    this.props.updatedAt = new Date();
  }

  setActivationDate(date: Date): void {
    this.props.activationDate = date;
    this.props.updatedAt = new Date();
  }

  setTrialEndDate(date: Date | null): void {
    this.props.trialEndDate = date ?? undefined;
    this.props.updatedAt = new Date();
  }

  setCurrentPeriod(start: Date, end: Date): void {
    this.props.currentPeriodStart = start;
    this.props.currentPeriodEnd = end;
    this.props.updatedAt = new Date();
  }

  addFeatureOverride(featureId: string, value: string, type: OverrideType): void {
    // Remove existing override if present
    this.removeFeatureOverride(featureId);
    
    this.props.featureOverrides.push({
      featureId,
      value,
      type,
      createdAt: new Date()
    });
    this.props.updatedAt = new Date();
  }

  removeFeatureOverride(featureId: string): void {
    this.props.featureOverrides = this.props.featureOverrides.filter(
      o => o.featureId !== featureId
    );
    this.props.updatedAt = new Date();
  }

  getFeatureOverride(featureId: string): FeatureOverride | null {
    return this.props.featureOverrides.find(o => o.featureId === featureId) || null;
  }

  clearTemporaryOverrides(): void {
    this.props.featureOverrides = this.props.featureOverrides.filter(
      o => o.type === OverrideType.Permanent
    );
    this.props.updatedAt = new Date();
  }

  canDelete(): boolean {
    return this.status === SubscriptionStatus.Expired;
  }
}

