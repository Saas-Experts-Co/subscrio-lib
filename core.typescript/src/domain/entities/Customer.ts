import { Entity } from '../base/Entity.js';
import { CustomerStatus } from '../value-objects/CustomerStatus.js';

export interface CustomerProps {
  key: string;
  displayName?: string;
  email?: string;
  externalBillingId?: string;
  status: CustomerStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer extends Entity<CustomerProps> {
  get key(): string {
    return this.props.key;
  }

  get status(): CustomerStatus {
    return this.props.status;
  }

  get externalBillingId(): string | undefined {
    return this.props.externalBillingId;
  }

  suspend(): void {
    this.props.status = CustomerStatus.Suspended;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.status = CustomerStatus.Active;
    this.props.updatedAt = new Date();
  }

  markDeleted(): void {
    this.props.status = CustomerStatus.Deleted;
    this.props.updatedAt = new Date();
  }

  canDelete(): boolean {
    return this.props.status === CustomerStatus.Deleted;
  }
}

