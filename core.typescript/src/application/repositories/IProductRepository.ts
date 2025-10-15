import { Product } from '../../domain/entities/Product.js';
import { ProductFilterDto } from '../dtos/ProductDto.js';

export interface IProductRepository {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  findByKey(key: string): Promise<Product | null>;
  findAll(filters?: ProductFilterDto): Promise<Product[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  
  // Product-Feature associations
  associateFeature(productId: string, featureId: string): Promise<void>;
  dissociateFeature(productId: string, featureId: string): Promise<void>;
  getFeaturesByProduct(productId: string): Promise<string[]>;
}

