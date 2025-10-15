import { IFeatureRepository } from '../repositories/IFeatureRepository.js';
import { IProductRepository } from '../repositories/IProductRepository.js';
import { 
  CreateFeatureDto, 
  CreateFeatureDtoSchema, 
  UpdateFeatureDto, 
  UpdateFeatureDtoSchema,
  FeatureFilterDto,
  FeatureFilterDtoSchema,
  FeatureDto 
} from '../dtos/FeatureDto.js';
import { FeatureMapper } from '../mappers/FeatureMapper.js';
import { Feature } from '../../domain/entities/Feature.js';
import { FeatureStatus, FeatureValueType } from '../../domain/value-objects/index.js';
import { generateId } from '../../infrastructure/utils/uuid.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  DomainError 
} from '../errors/index.js';

export class FeatureManagementService {
  constructor(
    private readonly featureRepository: IFeatureRepository,
    private readonly productRepository: IProductRepository
  ) {}

  async createFeature(dto: CreateFeatureDto): Promise<FeatureDto> {
    const validationResult = CreateFeatureDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid feature data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    // Check if key already exists
    const existing = await this.featureRepository.findByKey(validatedDto.key);
    if (existing) {
      throw new ConflictError(`Feature with key '${validatedDto.key}' already exists`);
    }

    // Validate default value based on type
    this.validateFeatureValue(validatedDto.defaultValue, validatedDto.valueType as FeatureValueType);

    const id = generateId();
    const feature = new Feature({
      key: validatedDto.key,
      displayName: validatedDto.displayName,
      description: validatedDto.description,
      valueType: validatedDto.valueType as FeatureValueType,
      defaultValue: validatedDto.defaultValue,
      groupName: validatedDto.groupName,
      status: FeatureStatus.Active,
      validator: validatedDto.validator,
      metadata: validatedDto.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }, id);

    await this.featureRepository.save(feature);
    return FeatureMapper.toDto(feature);
  }

  async updateFeature(key: string, dto: UpdateFeatureDto): Promise<FeatureDto> {
    const validationResult = UpdateFeatureDtoSchema.safeParse(dto);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid update data',
        validationResult.error.errors
      );
    }
    const validatedDto = validationResult.data;

    const feature = await this.featureRepository.findByKey(key);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${key}' not found`);
    }

    // Check key uniqueness if changing
    if (validatedDto.key && validatedDto.key !== feature.key) {
      const existing = await this.featureRepository.findByKey(validatedDto.key);
      if (existing) {
        throw new ConflictError(`Feature with key '${validatedDto.key}' already exists`);
      }
      feature.props.key = validatedDto.key;
    }

    // Update properties
    if (validatedDto.displayName !== undefined) {
      feature.updateDisplayName(validatedDto.displayName);
    }
    if (validatedDto.description !== undefined) {
      feature.props.description = validatedDto.description;
    }
    if (validatedDto.defaultValue !== undefined) {
      this.validateFeatureValue(validatedDto.defaultValue, feature.props.valueType);
      feature.props.defaultValue = validatedDto.defaultValue;
    }
    if (validatedDto.groupName !== undefined) {
      feature.props.groupName = validatedDto.groupName;
    }
    if (validatedDto.validator !== undefined) {
      feature.props.validator = validatedDto.validator;
    }
    if (validatedDto.metadata !== undefined) {
      feature.props.metadata = validatedDto.metadata;
    }

    feature.props.updatedAt = new Date();
    await this.featureRepository.save(feature);
    return FeatureMapper.toDto(feature);
  }

  async getFeature(key: string): Promise<FeatureDto | null> {
    const feature = await this.featureRepository.findByKey(key);
    return feature ? FeatureMapper.toDto(feature) : null;
  }

  async listFeatures(filters: FeatureFilterDto = { limit: 50, offset: 0 }): Promise<FeatureDto[]> {
    const validationResult = FeatureFilterDtoSchema.safeParse(filters);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid filter parameters',
        validationResult.error.errors
      );
    }

    const features = await this.featureRepository.findAll(validationResult.data);
    return features.map(FeatureMapper.toDto);
  }

  async archiveFeature(key: string): Promise<void> {
    const feature = await this.featureRepository.findByKey(key);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${key}' not found`);
    }

    feature.archive();
    await this.featureRepository.save(feature);
  }

  async unarchiveFeature(key: string): Promise<void> {
    const feature = await this.featureRepository.findByKey(key);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${key}' not found`);
    }

    feature.unarchive();
    await this.featureRepository.save(feature);
  }

  async deleteFeature(key: string): Promise<void> {
    const feature = await this.featureRepository.findByKey(key);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${key}' not found`);
    }

    if (!feature.canDelete()) {
      throw new DomainError(
        `Cannot delete feature with status '${feature.status}'. ` +
        'Feature must be archived before deletion.'
      );
    }

    await this.featureRepository.delete(feature.id);
  }

  async getFeaturesByProduct(productKey: string): Promise<FeatureDto[]> {
    // Verify product exists
    const product = await this.productRepository.findByKey(productKey);
    if (!product) {
      throw new NotFoundError(`Product with key '${productKey}' not found`);
    }

    const features = await this.featureRepository.findByProduct(product.id);
    return features.map(FeatureMapper.toDto);
  }

  private validateFeatureValue(value: string, valueType: FeatureValueType): void {
    switch (valueType) {
      case FeatureValueType.Toggle:
        if (!['true', 'false'].includes(value.toLowerCase())) {
          throw new ValidationError('Toggle features must have value "true" or "false"');
        }
        break;
      case FeatureValueType.Numeric:
        const num = Number(value);
        if (isNaN(num) || !isFinite(num)) {
          throw new ValidationError('Numeric features must have a valid number value');
        }
        break;
      case FeatureValueType.Text:
        // Text features accept any string value
        break;
      default:
        throw new ValidationError(`Unknown feature value type: ${valueType}`);
    }
  }
}
