import { Entity } from '../base/Entity.js';
import { ProductStatus } from '../value-objects/ProductStatus.js';

export interface ProductProps {
  key: string;
  displayName: string;
  description?: string;
  status: ProductStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends Entity<ProductProps> {
  get key(): string {
    return this.props.key;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  archive(): void {
    this.props.status = ProductStatus.Archived;
    this.props.updatedAt = new Date();
  }

  unarchive(): void {
    this.props.status = ProductStatus.Active;
    this.props.updatedAt = new Date();
  }

  canDelete(): boolean {
    return this.props.status === ProductStatus.Archived;
  }

  updateDisplayName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Display name cannot be empty');
    }
    this.props.displayName = name;
    this.props.updatedAt = new Date();
  }
}

