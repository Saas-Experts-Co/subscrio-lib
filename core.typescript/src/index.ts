// Main class
export { Subscrio } from './Subscrio.js';

// Configuration
export type { SubscrioConfig } from './config/types.js';
export { loadConfig } from './config/loader.js';

// DTOs
export * from './application/dtos/ProductDto.js';
export * from './application/dtos/FeatureDto.js';
export * from './application/dtos/PlanDto.js';
export * from './application/dtos/CustomerDto.js';
export * from './application/dtos/APIKeyDto.js';
export * from './application/dtos/SubscriptionDto.js';
export * from './application/dtos/BillingCycleDto.js';

// Errors
export * from './application/errors/index.js';

// Value objects (for type safety)
export { ProductStatus } from './domain/value-objects/ProductStatus.js';
export { FeatureStatus } from './domain/value-objects/FeatureStatus.js';
export { FeatureValueType } from './domain/value-objects/FeatureValueType.js';
export { PlanStatus } from './domain/value-objects/PlanStatus.js';
export { CustomerStatus } from './domain/value-objects/CustomerStatus.js';
export { APIKeyStatus } from './domain/value-objects/APIKeyStatus.js';
export { APIKeyScope } from './domain/value-objects/APIKeyScope.js';
export { SubscriptionStatus } from './domain/value-objects/SubscriptionStatus.js';
export { OverrideType } from './domain/value-objects/OverrideType.js';
export { DurationUnit } from './domain/value-objects/DurationUnit.js';

