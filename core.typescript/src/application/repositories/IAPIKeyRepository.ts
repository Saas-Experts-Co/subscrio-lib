import { APIKey } from '../../domain/entities/APIKey.js';
import { APIKeyFilterDto } from '../dtos/APIKeyDto.js';

export interface IAPIKeyRepository {
  save(apiKey: APIKey): Promise<APIKey>;
  findById(id: number): Promise<APIKey | null>;
  findByKey(key: string): Promise<APIKey | null>;
  findByKeyHash(keyHash: string): Promise<APIKey | null>;
  findAll(filters?: APIKeyFilterDto): Promise<APIKey[]>;
  delete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
}

