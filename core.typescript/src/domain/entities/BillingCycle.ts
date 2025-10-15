import { Entity } from '../base/Entity.js';
import { DurationUnit } from '../value-objects/DurationUnit.js';

export interface BillingCycleProps {
  planId: string;
  key: string;
  displayName: string;
  description?: string;
  durationValue: number;
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

  calculateNextPeriodEnd(startDate: Date): Date {
    const nextDate = new Date(startDate);
    
    switch (this.props.durationUnit) {
      case DurationUnit.Days:
        nextDate.setDate(nextDate.getDate() + this.props.durationValue);
        break;
      case DurationUnit.Weeks:
        nextDate.setDate(nextDate.getDate() + (this.props.durationValue * 7));
        break;
      case DurationUnit.Months:
        nextDate.setMonth(nextDate.getMonth() + this.props.durationValue);
        break;
      case DurationUnit.Years:
        nextDate.setFullYear(nextDate.getFullYear() + this.props.durationValue);
        break;
    }
    
    return nextDate;
  }

  canDelete(): boolean {
    // TODO: Check if any plans are using this billing cycle
    return true;
  }
}

