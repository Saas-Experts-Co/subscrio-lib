import { Entity } from '../base/Entity.js';
import { DurationUnit } from '../value-objects/DurationUnit.js';
import { now } from '../../infrastructure/utils/date.js';

export interface BillingCycleProps {
  planId: string;
  key: string;
  displayName: string;
  description?: string;
  durationValue?: number; // Optional for forever duration
  durationUnit: DurationUnit;
  externalProductId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BillingCycle extends Entity<BillingCycleProps> {
  get planId(): string {
    return this.props.planId;
  }

  get key(): string {
    return this.props.key;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  calculateNextPeriodEnd(startDate: Date): Date | null {
    // For forever duration, return null (never expires)
    if (this.props.durationUnit === DurationUnit.Forever) {
      return null;
    }
    
    const nextDate = new Date(startDate);
    const durationValue = this.props.durationValue ?? 1; // Default to 1 if not specified
    
    switch (this.props.durationUnit) {
      case DurationUnit.Days:
        nextDate.setDate(nextDate.getDate() + durationValue);
        break;
      case DurationUnit.Weeks:
        nextDate.setDate(nextDate.getDate() + (durationValue * 7));
        break;
      case DurationUnit.Months:
        nextDate.setMonth(nextDate.getMonth() + durationValue);
        break;
      case DurationUnit.Years:
        nextDate.setFullYear(nextDate.getFullYear() + durationValue);
        break;
    }
    
    return nextDate;
  }

  archive(): void {
    // Billing cycles don't have status, so we'll use a different approach
    // This method is here for consistency but may not be used
    this.props.updatedAt = now();
  }

  unarchive(): void {
    // Billing cycles don't have status, so we'll use a different approach
    // This method is here for consistency but may not be used
    this.props.updatedAt = now();
  }

  canDelete(): boolean {
    // TODO: Check if any plans are using this billing cycle
    return true;
  }
}

