import { IProductRepository } from '../repositories/IProductRepository.js';
import { IFeatureRepository } from '../repositories/IFeatureRepository.js';
import { Product } from '../../domain/entities/Product.js';
import { ProductStatus } from '../../domain/value-objects/ProductStatus.js';
import { 
  CreateProductDto, 
  CreateProductDtoSchema, 
  UpdateProductDto, 
  UpdateProductDtoSchema,
  ProductDto,
  ProductFilterDto,
  ProductFilterDtoSchema
} from '../dtos/ProductDto.js';
import { ProductMapper } from '../mappers/ProductMapper.js';
import { ValidationError, NotFoundError, ConflictError, DomainError } from '../errors/index.js';
import { generateId } from '../../infrastructure/utils/uuid.js';
import { now } from '../../infrastructure/utils/date.js';

export class ProductManagementService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly featureRepository: IFeatureRepository
  ) {}

  async createProduct(dto: CreateProductDto): Promise<ProductDto> {
    // Validate input
    const validation = CreateProductDtoSchema.safeParse(dto);
    if (!validation.success) {
      throw new ValidationError(
        `Invalid product data for key '${dto.key}': ${validation.error.errors.map(e => e.message).join(', ')}`,
        validation.error.errors
      );
    }
    const validatedDto = validation.data;

    // Check for duplicate key
    const existing = await this.productRepository.findByKey(validatedDto.key);
    if (existing) {
      throw new ConflictError(
        `Product with key '${validatedDto.key}' already exists. Existing product: ${existing.displayName} (ID: ${existing.id}, Status: ${existing.status})`
      );
    }

    // Create domain entity
    const id = generateId();
    const product = new Product({
      key: validatedDto.key,
      displayName: validatedDto.displayName,
      description: validatedDto.description,
      status: ProductStatus.Active,
      metadata: validatedDto.metadata,
      createdAt: now(),
      updatedAt: now()
    }, id);

    // Save
    await this.productRepository.save(product);

    return ProductMapper.toDto(product);
  }

  async updateProduct(key: string, dto: UpdateProductDto): Promise<ProductDto> {
    // Validate input
    const validation = UpdateProductDtoSchema.safeParse(dto);
    if (!validation.success) {
      throw new ValidationError('Invalid update data', validation.error.errors);
    }
    const validatedDto = validation.data;

    // Find existing by key
    const product = await this.productRepository.findByKey(key);
    if (!product) {
      throw new NotFoundError(`Product with key '${key}' not found. Please check the product key and try again.`);
    }

    // Key is immutable - no validation needed

    // Update properties
    if (validatedDto.displayName !== undefined) {
      product.updateDisplayName(validatedDto.displayName);
    }
    if (validatedDto.description !== undefined) {
      product.props.description = validatedDto.description;
    }
    if (validatedDto.metadata !== undefined) {
      product.props.metadata = validatedDto.metadata;
    }

    product.props.updatedAt = now();

    // Save
    await this.productRepository.save(product);

    return ProductMapper.toDto(product);
  }

  async getProduct(key: string): Promise<ProductDto | null> {
    const product = await this.productRepository.findByKey(key);
    return product ? ProductMapper.toDto(product) : null;
  }

  async listProducts(filters?: ProductFilterDto): Promise<ProductDto[]> {
    const validation = ProductFilterDtoSchema.safeParse(filters || {});
    if (!validation.success) {
      throw new ValidationError('Invalid filter parameters', validation.error.errors);
    }

    const products = await this.productRepository.findAll(validation.data);
    return products.map(ProductMapper.toDto);
  }

  async deleteProduct(key: string): Promise<void> {
    const product = await this.productRepository.findByKey(key);
    if (!product) {
      throw new NotFoundError(`Product with key '${key}' not found`);
    }

    if (!product.canDelete()) {
      throw new DomainError(
        `Cannot delete product with status '${product.status}'. Product must be archived before deletion.`
      );
    }

    await this.productRepository.delete(product.id);
  }

  async archiveProduct(key: string): Promise<ProductDto> {
    const product = await this.productRepository.findByKey(key);
    if (!product) {
      throw new NotFoundError(`Product with key '${key}' not found`);
    }

    product.archive();
    await this.productRepository.save(product);

    return ProductMapper.toDto(product);
  }

  async unarchiveProduct(key: string): Promise<ProductDto> {
    const product = await this.productRepository.findByKey(key);
    if (!product) {
      throw new NotFoundError(`Product with key '${key}' not found`);
    }

    product.unarchive();
    await this.productRepository.save(product);

    return ProductMapper.toDto(product);
  }

  async associateFeature(productKey: string, featureKey: string): Promise<void> {
    const product = await this.productRepository.findByKey(productKey);
    if (!product) {
      throw new NotFoundError(`Product with key '${productKey}' not found`);
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    await this.productRepository.associateFeature(product.id, feature.id);
  }

  async dissociateFeature(productKey: string, featureKey: string): Promise<void> {
    const product = await this.productRepository.findByKey(productKey);
    if (!product) {
      throw new NotFoundError(`Product with key '${productKey}' not found`);
    }

    const feature = await this.featureRepository.findByKey(featureKey);
    if (!feature) {
      throw new NotFoundError(`Feature with key '${featureKey}' not found`);
    }

    await this.productRepository.dissociateFeature(product.id, feature.id);
  }
}

