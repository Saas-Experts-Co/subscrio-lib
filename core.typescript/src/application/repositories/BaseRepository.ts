import { NotFoundError, ConflictError } from '../errors/index.js';

/**
 * Base repository interface providing common repository functionality
 */
export abstract class BaseRepository<T> {
  /**
   * Check if entity exists by ID
   */
  abstract exists(id: string): Promise<boolean>;

  /**
   * Find entity by ID
   */
  abstract findById(id: string): Promise<T | null>;

  /**
   * Save entity (create or update)
   */
  abstract save(entity: T): Promise<void>;

  /**
   * Delete entity by ID
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Get entity by ID or throw NotFoundError
   */
  protected async getByIdOrThrow(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NotFoundError(`Entity with ID '${id}' not found`);
    }
    return entity;
  }

  /**
   * Check if entity exists and throw ConflictError if it does
   */
  protected async checkNotExists(id: string, entityType: string): Promise<void> {
    const exists = await this.exists(id);
    if (exists) {
      throw new ConflictError(`${entityType} with ID '${id}' already exists`);
    }
  }

  /**
   * Check if entity exists and throw NotFoundError if it doesn't
   */
  protected async checkExists(id: string, entityType: string): Promise<void> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError(`${entityType} with ID '${id}' not found`);
    }
  }
}
