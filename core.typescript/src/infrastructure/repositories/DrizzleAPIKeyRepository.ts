import { IAPIKeyRepository } from '../../application/repositories/IAPIKeyRepository.js';
import { APIKey } from '../../domain/entities/APIKey.js';
import { APIKeyMapper } from '../../application/mappers/APIKeyMapper.js';
import { DrizzleDb } from '../database/drizzle.js';
import { api_keys } from '../database/schema.js';
import { eq, and, like, or, desc, asc } from 'drizzle-orm';
import { APIKeyFilterDto } from '../../application/dtos/APIKeyDto.js';

export class DrizzleAPIKeyRepository implements IAPIKeyRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(apiKey: APIKey): Promise<APIKey> {
    const record = APIKeyMapper.toPersistence(apiKey);
    
    if (apiKey.id === undefined) {
      // Insert new entity
      const [inserted] = await this.db
        .insert(api_keys)
        .values(record)
        .returning({ id: api_keys.id });
      
      // Update entity with generated ID
      return new APIKey(apiKey.props, inserted.id);
    } else {
      // Update existing entity
      await this.db
        .update(api_keys)
        .set({
          key: record.key,
          key_hash: record.key_hash,
          display_name: record.display_name,
          description: record.description,
          status: record.status,
          scope: record.scope,
          expires_at: record.expires_at,
          last_used_at: record.last_used_at,
          ip_whitelist: record.ip_whitelist,
          created_by: record.created_by,
          metadata: record.metadata,
          updated_at: record.updated_at
        })
        .where(eq(api_keys.id, apiKey.id));
      
      return apiKey;
    }
  }

  async findById(id: number): Promise<APIKey | null> {
    const [record] = await this.db
      .select()
      .from(api_keys)
      .where(eq(api_keys.id, id))
      .limit(1);
    
    return record ? APIKeyMapper.toDomain(record) : null;
  }

  async findByKey(key: string): Promise<APIKey | null> {
    const [record] = await this.db
      .select()
      .from(api_keys)
      .where(eq(api_keys.key, key))
      .limit(1);
    
    return record ? APIKeyMapper.toDomain(record) : null;
  }

  async findByKeyHash(keyHash: string): Promise<APIKey | null> {
    const [record] = await this.db
      .select()
      .from(api_keys)
      .where(eq(api_keys.key_hash, keyHash))
      .limit(1);
    
    return record ? APIKeyMapper.toDomain(record) : null;
  }

  async findAll(filters?: APIKeyFilterDto): Promise<APIKey[]> {
    let query = this.db.select().from(api_keys);

    if (filters) {
      const conditions = [];

      if (filters.status) {
        conditions.push(eq(api_keys.status, filters.status));
      }

      if (filters.scope) {
        conditions.push(eq(api_keys.scope, filters.scope));
      }

      if (filters.createdBy) {
        conditions.push(eq(api_keys.created_by, filters.createdBy));
      }

      if (filters.search) {
        // Drizzle handles parameterized queries automatically - no manual sanitization needed
        conditions.push(
          or(
            like(api_keys.display_name, `%${filters.search}%`),
            like(api_keys.description, `%${filters.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      
      if (sortBy === 'displayName') {
        query = query.orderBy(sortOrder === 'desc' ? desc(api_keys.display_name) : asc(api_keys.display_name)) as typeof query;
      } else if (sortBy === 'lastUsedAt') {
        query = query.orderBy(sortOrder === 'desc' ? desc(api_keys.last_used_at) : asc(api_keys.last_used_at)) as typeof query;
      } else {
        query = query.orderBy(sortOrder === 'desc' ? desc(api_keys.created_at) : asc(api_keys.created_at)) as typeof query;
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit) as typeof query;
      }
      if (filters.offset) {
        query = query.offset(filters.offset) as typeof query;
      }
    } else {
      query = query.orderBy(desc(api_keys.created_at)) as typeof query;
    }

    const records = await query;
    return records.map(APIKeyMapper.toDomain);
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(api_keys).where(eq(api_keys.id, id));
  }

  async exists(id: number): Promise<boolean> {
    const [record] = await this.db
      .select({ id: api_keys.id })
      .from(api_keys)
      .where(eq(api_keys.id, id))
      .limit(1);
    
    return !!record;
  }
}
