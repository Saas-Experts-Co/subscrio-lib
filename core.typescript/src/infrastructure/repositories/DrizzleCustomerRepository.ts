import { ICustomerRepository } from '../../application/repositories/ICustomerRepository.js';
import { Customer } from '../../domain/entities/Customer.js';
import { CustomerMapper } from '../../application/mappers/CustomerMapper.js';
import { DrizzleDb } from '../database/drizzle.js';
import { customers } from '../database/schema.js';
import { eq, and, like, or, desc, asc } from 'drizzle-orm';
import { CustomerFilterDto } from '../../application/dtos/CustomerDto.js';

export class DrizzleCustomerRepository implements ICustomerRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(customer: Customer): Promise<void> {
    const record = CustomerMapper.toPersistence(customer);
    await this.db
      .insert(customers)
      .values(record)
      .onConflictDoUpdate({
        target: customers.id,
        set: record
      });
  }

  async findById(id: string): Promise<Customer | null> {
    const [record] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findByKey(key: string): Promise<Customer | null> {
    const [record] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.key, key))
      .limit(1);
    
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findByExternalBillingId(externalBillingId: string): Promise<Customer | null> {
    const [record] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.external_billing_id, externalBillingId))
      .limit(1);
    
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findAll(filters?: CustomerFilterDto): Promise<Customer[]> {
    let query = this.db.select().from(customers);

    if (filters) {
      const conditions = [];

      if (filters.status) {
        conditions.push(eq(customers.status, filters.status));
      }

      if (filters.search) {
        // Sanitize search input to prevent SQL injection
        const sanitizedSearch = filters.search.replace(/[%_\\]/g, '\\$&');
        conditions.push(
          or(
            like(customers.key, `%${sanitizedSearch}%`),
            like(customers.display_name, `%${sanitizedSearch}%`),
            like(customers.email, `%${sanitizedSearch}%`)
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
        query = query.orderBy(sortOrder === 'desc' ? desc(customers.display_name) : asc(customers.display_name)) as typeof query;
      } else if (sortBy === 'key') {
        query = query.orderBy(sortOrder === 'desc' ? desc(customers.key) : asc(customers.key)) as typeof query;
      } else {
        query = query.orderBy(sortOrder === 'desc' ? desc(customers.created_at) : asc(customers.created_at)) as typeof query;
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit) as typeof query;
      }
      if (filters.offset) {
        query = query.offset(filters.offset) as typeof query;
      }
    } else {
      query = query.orderBy(desc(customers.created_at)) as typeof query;
    }

    const records = await query;
    return records.map(CustomerMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(customers).where(eq(customers.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    
    return !!record;
  }
}
