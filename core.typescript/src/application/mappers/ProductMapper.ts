import { Product } from '../../domain/entities/Product.js';
import { ProductDto } from '../dtos/ProductDto.js';
import { ProductStatus } from '../../domain/value-objects/ProductStatus.js';

export class ProductMapper {
  static toDto(product: Product): ProductDto {
    return {
      key: product.key,
      displayName: product.displayName,
      description: product.props.description ?? null,
      status: product.status,
      metadata: product.props.metadata ?? null,
      createdAt: product.props.createdAt.toISOString(),
      updatedAt: product.props.updatedAt.toISOString()
    };
  }

  static toDomain(raw: any): Product {
    return new Product(
      {
        key: raw.key,
        displayName: raw.display_name,
        description: raw.description,
        status: raw.status as ProductStatus,
        metadata: raw.metadata,
        createdAt: new Date(raw.created_at),
        updatedAt: new Date(raw.updated_at)
      },
      raw.id
    );
  }

  static toPersistence(product: Product): any {
    return {
      id: product.id,
      key: product.key,
      display_name: product.displayName,
      description: product.props.description,
      status: product.status,
      metadata: product.props.metadata,
      created_at: product.props.createdAt,
      updated_at: product.props.updatedAt
    };
  }
}

