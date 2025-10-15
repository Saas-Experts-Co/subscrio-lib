import { Feature } from '../../domain/entities/Feature.js';
import { FeatureFilterDto } from '../dtos/FeatureDto.js';

export interface IFeatureRepository {
  save(feature: Feature): Promise<void>;
  findById(id: string): Promise<Feature | null>;
  findByKey(key: string): Promise<Feature | null>;
  findAll(filters?: FeatureFilterDto): Promise<Feature[]>;
  findByIds(ids: string[]): Promise<Feature[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  
  // Get features by product
  findByProduct(productId: string): Promise<Feature[]>;
}

