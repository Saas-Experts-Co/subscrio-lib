import { eq, and, ilike, or } from 'drizzle-orm';
import { DrizzleDb } from '../database/drizzle.js';
import { products, product_features, plans } from '../database/schema.js';
import { IProductRepository } from '../../application/repositories/IProductRepository.js';
import { Product } from '../../domain/entities/Product.js';
import { ProductMapper } from '../../application/mappers/ProductMapper.js';
import { ProductFilterDto } from '../../application/dtos/ProductDto.js';
import { generateId } from '../utils/uuid.js';
import { now } from '../utils/date.js';

export class DrizzleProductRepository implements IProductRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(product: Product): Promise<void> {
    const record = ProductMapper.toPersistence(product);
    await this.db
      .insert(products)
      .values(record)
      .onConflictDoUpdate({
        target: products.id,
        set: {
          key: record.key,
          display_name: record.display_name,
          description: record.description,
          status: record.status,
          metadata: record.metadata,
          updated_at: record.updated_at
        }
      });
  }

  async findById(id: string): Promise<Product | null> {
    const [record] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return record ? ProductMapper.toDomain(record) : null;
  }

  async findByKey(key: string): Promise<Product | null> {
    const [record] = await this.db
      .select()
      .from(products)
      .where(eq(products.key, key))
      .limit(1);

    return record ? ProductMapper.toDomain(record) : null;
  }

  async findAll(filters?: ProductFilterDto): Promise<Product[]> {
    let query = this.db.select().from(products);

    if (filters?.status) {
      query = query.where(eq(products.status, filters.status)) as any;
    }

    if (filters?.search) {
      // Drizzle handles parameterized queries automatically - no manual sanitization needed
      query = query.where(
        or(
          ilike(products.display_name, `%${filters.search}%`),
          ilike(products.key, `%${filters.search}%`)
        )
      ) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const records = await query;
    return records.map(ProductMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return !!record;
  }

  async associateFeature(productId: string, featureId: string): Promise<void> {
    await this.db
      .insert(product_features)
      .values({
        id: generateId(),
        product_id: productId,
        feature_id: featureId,
        created_at: now()
      })
      .onConflictDoNothing();
  }

  async dissociateFeature(productId: string, featureId: string): Promise<void> {
    await this.db
      .delete(product_features)
      .where(
        and(
          eq(product_features.product_id, productId),
          eq(product_features.feature_id, featureId)
        )
      );
  }

  async getFeaturesByProduct(productId: string): Promise<string[]> {
    const records = await this.db
      .select({ feature_id: product_features.feature_id })
      .from(product_features)
      .where(eq(product_features.product_id, productId));

    return records.map(r => r.feature_id);
  }

  async hasPlans(productKey: string): Promise<boolean> {
    const [record] = await this.db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.product_key, productKey))
      .limit(1);

    return !!record;
  }
}

