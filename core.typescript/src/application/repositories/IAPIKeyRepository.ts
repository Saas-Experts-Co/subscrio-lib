import { APIKey } from '../../domain/entities/APIKey.js';
import { APIKeyFilterDto } from '../dtos/APIKeyDto.js';

export interface IAPIKeyRepository {
  save(apiKey: APIKey): Promise<void>;
  findById(id: string): Promise<APIKey | null>;
  findByKey(key: string): Promise<APIKey | null>;
  findByKeyHash(keyHash: string): Promise<APIKey | null>;
  findAll(filters?: APIKeyFilterDto): Promise<APIKey[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

