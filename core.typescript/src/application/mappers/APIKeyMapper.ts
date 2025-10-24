import { APIKey } from '../../domain/entities/APIKey.js';
import { APIKeyDto } from '../dtos/APIKeyDto.js';
import { APIKeyStatus } from '../../domain/value-objects/APIKeyStatus.js';
import { APIKeyScope } from '../../domain/value-objects/APIKeyScope.js';

export class APIKeyMapper {
  static toDto(apiKey: APIKey): APIKeyDto {
    return {
      key: apiKey.key,
      displayName: apiKey.props.displayName ?? null,
      description: apiKey.props.description ?? null,
      status: apiKey.status,
      scope: apiKey.scope,
      expiresAt: apiKey.props.expiresAt?.toISOString() ?? null,
      lastUsedAt: apiKey.props.lastUsedAt?.toISOString() ?? null,
      ipWhitelist: apiKey.props.ipWhitelist ?? null,
      createdBy: apiKey.props.createdBy ?? null,
      metadata: apiKey.props.metadata ?? null,
      createdAt: apiKey.props.createdAt.toISOString(),
      updatedAt: apiKey.props.updatedAt.toISOString()
    };
  }

  static toDomain(raw: any): APIKey {
    return new APIKey(
      {
        key: raw.key,
        keyHash: raw.key_hash,
        displayName: raw.display_name,
        description: raw.description,
        status: raw.status as APIKeyStatus,
        scope: raw.scope as APIKeyScope,
        expiresAt: raw.expires_at ? new Date(raw.expires_at) : undefined,
        lastUsedAt: raw.last_used_at ? new Date(raw.last_used_at) : undefined,
        ipWhitelist: raw.ip_whitelist,
        createdBy: raw.created_by,
        metadata: raw.metadata,
        createdAt: new Date(raw.created_at),
        updatedAt: new Date(raw.updated_at)
      },
      raw.id
    );
  }

  static toPersistence(apiKey: APIKey): any {
    return {
      id: apiKey.id,
      key: apiKey.key,
      key_hash: apiKey.keyHash,
      display_name: apiKey.props.displayName,
      description: apiKey.props.description,
      status: apiKey.status,
      scope: apiKey.scope,
      expires_at: apiKey.props.expiresAt,
      last_used_at: apiKey.props.lastUsedAt,
      ip_whitelist: apiKey.props.ipWhitelist,
      created_by: apiKey.props.createdBy,
      metadata: apiKey.props.metadata,
      created_at: apiKey.props.createdAt,
      updated_at: apiKey.props.updatedAt
    };
  }
}

