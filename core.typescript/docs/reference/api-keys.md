# API Key Management Service Reference

## Service Overview
The API Key Management Service issues, updates, archives, revokes, and validates hashed API keys for third-party integrations or automation. Plaintext values are shown exactly once (during creation) and never stored. Each key tracks scope (`admin` or `readonly`), status, optional metadata, expiration, IP whitelist, and audit timestamps.

- Keys are stored as SHA-256 hashes; plaintext must be persisted by the caller.
- Validation enforces scope, expiration, revocation, and optional IP restrictions while updating `lastUsedAt`.
- Listing all keys is intentionally unsupported in the public API for security; keys are addressed individually.

## Accessing the Service
```typescript
import { Subscrio } from '@subscrio/core';

const subscrio = new Subscrio({ database: { connectionString: process.env.DATABASE_URL! } });
const apiKeys = subscrio.apiKeys;
```

## Method Catalog

| Method | Description | Returns |
| --- | --- | --- |
| `createAPIKey` | Issues a new API key and returns plaintext once | `Promise<APIKeyWithPlaintextDto>` |
| `updateAPIKey` | Updates mutable metadata and configuration | `Promise<APIKeyDto>` |
| `archiveAPIKey` | Marks a key inactive without deleting it | `Promise<void>` |
| `unarchiveAPIKey` | Restores an archived key to active | `Promise<void>` |
| `deleteAPIKey` | Permanently deletes a revoked key | `Promise<void>` |
| `validateAPIKey` | Validates a plaintext key, optional scope, and IP whitelist | `Promise<boolean>` |
| `getAPIKeyByPlaintext` | Looks up a key by plaintext for admin tooling | `Promise<APIKeyDto \| null>` |

## Method Reference

### createAPIKey

#### Description
 Generates a secure plaintext key, stores its hash, and returns the plaintext exactly once.

#### Signature
```typescript
createAPIKey(dto: CreateAPIKeyDto): Promise<APIKeyWithPlaintextDto>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dto` | `CreateAPIKeyDto` | Yes | Payload describing the key being issued. |

#### Input Properties
- `displayName` (`string`, required): 1–255 char label shown in the admin UI.
- `description` (`string`, optional): up to 1000 characters.
- `scope` (`'admin' | 'readonly'`, required): determines accessible endpoints.
- `expiresAt` (`string | Date`, optional): optional expiration (ISO string or `Date`).
- `ipWhitelist` (`string[]`, optional): IPv4/IPv6 addresses allowed to use the key.
- `createdBy` (`string`, optional): identifier of issuer (≤255 chars).
- `metadata` (`Record<string, unknown>`, optional): additional JSON-safe context.

#### Returns

`Promise<APIKeyWithPlaintextDto>` – the persisted DTO plus plaintext.

#### Return Properties

- `plaintextKey` (`string`): only returned now—store securely.
- `key` (`string`): public identifier (e.g., `ak_live_xxx`).
- `displayName` (`string`): display label.
- `description` (`string | null`): optional description.
- `status` (`string`): `active`, `archived`, or `revoked`.
- `scope` (`string`): `'admin'` or `'readonly'`.
- `expiresAt` (`string | null`): ISO timestamp if set.
- `lastUsedAt` (`string | null`): updated whenever validation succeeds.
- `ipWhitelist` (`string[] | null`): stored IP restrictions.
- `createdBy` (`string | null`): issuer metadata.
- `metadata` (`Record<string, unknown> | null`): additional metadata.
- `createdAt` (`string`): ISO timestamp.
- `updatedAt` (`string`): ISO timestamp.

#### Expected Results
- Validates DTO.
- Generates random plaintext, hashes it with SHA-256, ensures no hash collision.
- Persists API key with status `active` and returns DTO + plaintext.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid. |

#### Example
```typescript
const issued = await apiKeys.createAPIKey({
  displayName: 'Admin CLI',
  scope: 'admin',
  ipWhitelist: ['192.0.2.10']
});
console.log(issued.plaintextKey); // write to secret vault immediately
```

### updateAPIKey

#### Description
 Updates mutable fields for an existing key (display name, metadata, scope, expiry, IP rules, etc.).

#### Signature
```typescript
updateAPIKey(key: string, dto: UpdateAPIKeyDto): Promise<APIKeyDto>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Public identifier (e.g., `ak_xxx`). |
| `dto` | `UpdateAPIKeyDto` | Yes | Partial object describing new values. |

#### Input Properties
- `displayName` (`string`, optional): updated label (1–255 chars).
- `description` (`string`, optional): up to 1000 characters.
- `scope` (`'admin' | 'readonly'`, optional): new scope for the key.
- `expiresAt` (`string | Date`, optional): override expiration.
- `ipWhitelist` (`string[]`, optional): replace whitelist values.
- `createdBy` (`string`, optional): issuer metadata.
- `metadata` (`Record<string, unknown>`, optional): arbitrary context.

#### Returns

`Promise<APIKeyDto>` – updated key snapshot (same fields as above minus plaintext).

#### Return Properties

- Same shape as `APIKeyDto` (see `createAPIKey` return properties).

#### Expected Results
- Validates DTO.
- Loads API key, applies allowed updates, saves.

#### Potential Errors

| Error | When |
| --- | --- |
| `ValidationError` | DTO invalid. |
| `NotFoundError` | Key missing. |

#### Example
```typescript
await apiKeys.updateAPIKey('ak_live_123', {
  displayName: 'Admin CLI (2025)',
  expiresAt: new Date('2025-12-31T23:59:59Z')
});
```

### archiveAPIKey

#### Description
 Temporarily disables a key without deleting it.

#### Signature
```typescript
archiveAPIKey(key: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Key to archive. |

#### Returns

`Promise<void>`

#### Return Properties
- None.

#### Expected Results
- Loads key, sets status to `archived`, saves.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Key missing. |

#### Example
```typescript
await apiKeys.archiveAPIKey('ak_temp_001');
```

### unarchiveAPIKey

#### Description
 Restores an archived key to active.

#### Signature
```typescript
unarchiveAPIKey(key: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Archived key to restore. |

#### Returns

`Promise<void>`

#### Return Properties
- None.

#### Expected Results
- Loads key, sets status to `active`, saves.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Key missing. |

#### Example
```typescript
await apiKeys.unarchiveAPIKey('ak_temp_001');
```

### deleteAPIKey

#### Description
 Permanently deletes a key that has already been revoked/archived.

#### Signature
```typescript
deleteAPIKey(key: string): Promise<void>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Key scheduled for deletion. |

#### Returns

`Promise<void>`

#### Return Properties
- None.

#### Expected Results
- Loads key and confirms `apiKey.canDelete()` (typically requires `revoked` status).
- Deletes record via repository.

#### Potential Errors

| Error | When |
| --- | --- |
| `NotFoundError` | Key missing. |
| `DomainError` | Key not revoked/eligible for deletion. |

#### Example
```typescript
await apiKeys.deleteAPIKey('ak_revoked_42');
```

### validateAPIKey

#### Description
 Validates a plaintext key plus optional required scope and client IP, updating `lastUsedAt` on success.

#### Signature
```typescript
validateAPIKey(
  plaintextKey: string,
  requiredScope?: 'admin' | 'readonly',
  clientIp?: string
): Promise<boolean>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `plaintextKey` | `string` | Yes | Key value provided by client. |
| `requiredScope` | `'admin' \| 'readonly'` | No | Ensures key meets/exceeds this scope. |
| `clientIp` | `string` | No | Optional IP to match against whitelist. |

#### Returns

`Promise<boolean>` – `true` when validation passes (side effect: updates `lastUsedAt`).

#### Return Properties
- None (primitive boolean result).

#### Expected Results
- Hashes plaintext, loads key, ensures it exists and is neither revoked nor expired.
- Validates scope hierarchy and IP whitelist (if provided).
- Calls `apiKey.updateLastUsed()` and saves.

#### Potential Errors

| Error | When |
| --- | --- |
| `AuthError` | Key missing, revoked, expired, insufficient scope, or IP mismatch. |

#### Example
```typescript
await apiKeys.validateAPIKey(
  request.headers['x-api-key'],
  'admin',
  request.ip
);
```

### getAPIKeyByPlaintext

#### Description
 Administrative helper to resolve a plaintext key to its DTO (useful for scripts or migrations).

#### Signature
```typescript
getAPIKeyByPlaintext(plaintextKey: string): Promise<APIKeyDto | null>
```

#### Inputs

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `plaintextKey` | `string` | Yes | Key string to resolve. |

#### Returns

`Promise<APIKeyDto | null>`

#### Return Properties
- `APIKeyDto` shape when found (see `createAPIKey` return properties).
- `null` when the hashed key cannot be found.

#### Expected Results
- Hashes plaintext, looks up the hashed record, and returns DTO or `null`.

#### Potential Errors
- None.

#### Example
```typescript
const key = await apiKeys.getAPIKeyByPlaintext('ak_live_example');
```

## Related Workflows
- Use `validateAPIKey` in REST middleware to enforce scopes/IPs and update audit fields.
- Archive keys for temporary suspension; revoke/delete only after confirming the key should never be used again.
- The plaintext key is irrecoverable after creation—store it in your secret manager immediately.
