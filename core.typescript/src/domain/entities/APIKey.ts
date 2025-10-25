import { Entity } from '../base/Entity.js';
import { APIKeyStatus } from '../value-objects/APIKeyStatus.js';
import { APIKeyScope } from '../value-objects/APIKeyScope.js';
import { now } from '../../infrastructure/utils/date.js';

export interface APIKeyProps {
  key: string;  // External reference key for this API key
  keyHash: string;
  displayName: string;
  description?: string;
  status: APIKeyStatus;
  scope: APIKeyScope;
  expiresAt?: Date;
  lastUsedAt?: Date;
  ipWhitelist?: string[];
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class APIKey extends Entity<APIKeyProps> {
  get key(): string {
    return this.props.key;
  }

  get keyHash(): string {
    return this.props.keyHash;
  }

  get status(): APIKeyStatus {
    return this.props.status;
  }

  get scope(): APIKeyScope {
    return this.props.scope;
  }

  archive(): void {
    this.props.status = APIKeyStatus.Revoked;
    this.props.updatedAt = now();
  }

  unarchive(): void {
    this.props.status = APIKeyStatus.Active;
    this.props.updatedAt = now();
  }

  updateLastUsed(): void {
    this.props.lastUsedAt = now();
  }

  isExpired(): boolean {
    if (!this.props.expiresAt) {
      return false;
    }
    return this.props.expiresAt < now();
  }

  isValidForIp(ip: string): boolean {
    if (!this.props.ipWhitelist || this.props.ipWhitelist.length === 0) {
      return true;
    }
    return this.props.ipWhitelist.includes(ip);
  }

  isValidForScope(requiredScope: string): boolean {
    return this.props.scope === requiredScope || this.props.scope === 'admin';
  }

  canDelete(): boolean {
    return this.props.status === APIKeyStatus.Revoked;
  }
}

