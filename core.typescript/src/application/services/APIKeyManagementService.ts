import { IAPIKeyRepository } from '../repositories/IAPIKeyRepository.js';
import { 
  CreateAPIKeyDto, 
  CreateAPIKeyDtoSchema, 
  UpdateAPIKeyDto, 
  UpdateAPIKeyDtoSchema,
  APIKeyDto,
  APIKeyWithPlaintextDto 
} from '../dtos/APIKeyDto.js';
import { APIKeyMapper } from '../mappers/APIKeyMapper.js';
import { APIKey } from '../../domain/entities/APIKey.js';
import { APIKeyStatus, APIKeyScope } from '../../domain/value-objects/index.js';
import { generateId, generateKey } from '../../infrastructure/utils/uuid.js';
import crypto from 'crypto';
import { 
  ValidationError, 
  NotFoundError, 
  AuthError 
} from '../errors/index.js';

export class APIKeyManagementService {
  constructor(
    private readonly apiKeyRepository: IAPIKeyRepository
  ) {}

  async createAPIKey(dto: CreateAPIKeyDto): Promise<APIKeyWithPlaintextDto> {
    const validationResult = CreateAPIKeyDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid API key data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    // Generate API key
    const plaintextKey = this.generateAPIKey();
    const keyHash = this.hashAPIKey(plaintextKey);

    // Check if hash already exists (extremely unlikely but possible)
    const existing = await this.apiKeyRepository.findByKeyHash(keyHash);
    if (existing) {
      // Regenerate if collision (extremely rare)
      return this.createAPIKey(dto);
    }

    const id = generateId();
    const key = generateKey('ak');  // Generate external reference key
    const apiKey = new APIKey({
      key,
      keyHash,
      displayName: validatedDto.displayName,
      description: validatedDto.description,
      status: APIKeyStatus.Active,
      scope: validatedDto.scope as APIKeyScope,
      expiresAt: validatedDto.expiresAt ? new Date(validatedDto.expiresAt) : undefined,
      lastUsedAt: undefined,
      ipWhitelist: validatedDto.ipWhitelist,
      createdBy: validatedDto.createdBy,
      metadata: validatedDto.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }, id);

    await this.apiKeyRepository.save(apiKey);

    // Return with plaintext key (only time it's available)
    return {
      ...APIKeyMapper.toDto(apiKey),
      plaintextKey
    };
  }

  async updateAPIKey(key: string, dto: UpdateAPIKeyDto): Promise<APIKeyDto> {
    const validationResult = UpdateAPIKeyDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid update data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    const apiKey = await this.apiKeyRepository.findByKey(key);
    if (!apiKey) {
      throw new NotFoundError(`API key with key '${key}' not found`);
    }

    // Update properties
    if (validatedDto.displayName !== undefined) {
      apiKey.props.displayName = validatedDto.displayName;
    }
    if (validatedDto.description !== undefined) {
      apiKey.props.description = validatedDto.description;
    }
    if (validatedDto.ipWhitelist !== undefined) {
      apiKey.props.ipWhitelist = validatedDto.ipWhitelist;
    }
    if (validatedDto.metadata !== undefined) {
      apiKey.props.metadata = validatedDto.metadata;
    }

    apiKey.props.updatedAt = new Date();
    await this.apiKeyRepository.save(apiKey);
    return APIKeyMapper.toDto(apiKey);
  }

  // NOTE: getAPIKey and listAPIKeys removed per security requirements
  // API keys should not be exposed once created. Use infrastructure
  // repository methods directly for internal operations only.

  async archiveAPIKey(key: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findByKey(key);
    if (!apiKey) {
      throw new NotFoundError(`API key with key '${key}' not found`);
    }

    apiKey.archive();
    await this.apiKeyRepository.save(apiKey);
  }

  async unarchiveAPIKey(key: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findByKey(key);
    if (!apiKey) {
      throw new NotFoundError(`API key with key '${key}' not found`);
    }

    apiKey.unarchive();
    await this.apiKeyRepository.save(apiKey);
  }

  async deleteAPIKey(key: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findByKey(key);
    if (!apiKey) {
      throw new NotFoundError(`API key with key '${key}' not found`);
    }

    if (!apiKey.canDelete()) {
      throw new ValidationError(
        `Cannot delete API key with status '${apiKey.status}'. ` +
        'API key must be revoked before deletion.'
      );
    }

    await this.apiKeyRepository.delete(apiKey.id);
  }

  /**
   * Validate API key and update last used timestamp
   */
  async validateAPIKey(
    plaintextKey: string, 
    requiredScope?: APIKeyScope,
    clientIp?: string
  ): Promise<boolean> {
    const keyHash = this.hashAPIKey(plaintextKey);
    const apiKey = await this.apiKeyRepository.findByKeyHash(keyHash);
    
    if (!apiKey) {
      throw new AuthError('Invalid API key');
    }

    if (apiKey.status === APIKeyStatus.Revoked) {
      throw new AuthError('API key has been revoked');
    }

    if (apiKey.isExpired()) {
      throw new AuthError('API key has expired');
    }

    if (clientIp && !apiKey.isValidForIp(clientIp)) {
      throw new AuthError('API key not valid for this IP address');
    }

    if (requiredScope && !apiKey.isValidForScope(requiredScope)) {
      throw new AuthError(`API key does not have required scope: ${requiredScope}`);
    }

    // Update last used timestamp
    apiKey.updateLastUsed();
    await this.apiKeyRepository.save(apiKey);

    return true;
  }

  /**
   * Get API key by plaintext key (for validation)
   */
  async getAPIKeyByPlaintext(plaintextKey: string): Promise<APIKeyDto | null> {
    const keyHash = this.hashAPIKey(plaintextKey);
    const apiKey = await this.apiKeyRepository.findByKeyHash(keyHash);
    return apiKey ? APIKeyMapper.toDto(apiKey) : null;
  }

  private generateAPIKey(): string {
    // Generate a secure random API key
    const randomBytes = crypto.randomBytes(32);
    return `sk_${randomBytes.toString('hex')}`;
  }

  private hashAPIKey(plaintextKey: string): string {
    // Use SHA-256 for hashing API keys
    return crypto.createHash('sha256').update(plaintextKey).digest('hex');
  }
}
