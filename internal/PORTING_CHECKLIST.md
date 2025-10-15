# Subscrio Multi-Language Porting Checklist

This checklist provides a systematic approach to port the TypeScript Subscrio library to .NET, Python, Rust, and Go while maintaining architectural consistency and feature parity.

## Pre-Porting Analysis ✅

### Core Architecture Understanding
- [x] Domain-Driven Design (DDD) with 3 layers: Domain, Application, Infrastructure
- [x] 8 domain entities with business logic and state management
- [x] 11 value objects (enums) for type safety
- [x] 7 repository interfaces with clear contracts
- [x] 9 application services for business orchestration
- [x] PostgreSQL database with 11 tables and relationships
- [x] Drizzle ORM for database operations
- [x] Zod validation schemas for DTOs
- [x] Stripe payment integration
- [x] Comprehensive E2E test suite

### External Dependencies Mapping
- [x] **Database**: PostgreSQL → PostgreSQL (universal)
- [x] **ORM**: Drizzle → Language-specific ORM
- [x] **Validation**: Zod → Language-specific validation
- [x] **Hashing**: bcryptjs → Language-specific bcrypt
- [x] **UUIDs**: uuidv7 → Language-specific UUID v7
- [x] **Payments**: Stripe → Stripe SDKs
- [x] **Testing**: Vitest → Language-specific test framework

---

## Language-Specific Porting Plans

### 1. .NET (C#) Port

#### Project Structure
```
Subscrio.Core/
├── Domain/
│   ├── Entities/           # 8 entity classes
│   ├── ValueObjects/       # 11 enum classes
│   ├── Services/           # 2 domain services
│   └── Base/              # Entity base class
├── Application/
│   ├── DTOs/              # 7 DTO classes with validation
│   ├── Mappers/           # 7 mapper classes (Mapperly)
│   ├── Repositories/      # 7 repository interfaces
│   ├── Services/          # 9 management services
│   └── Errors/            # Custom exception classes
├── Infrastructure/
│   ├── Database/          # EF Core context (database independent)
│   ├── Repositories/      # 7 repository implementations
│   └── Utils/             # UUIDv7 and crypto utilities
└── Subscrio.cs           # Main public API class
```

#### Technology Stack
- [ ] **Framework**: .NET 9.0 (latest available)
- [ ] **ORM**: Entity Framework Core 9.0 (database independent)
- [ ] **Database**: Database independent (SQL Server, PostgreSQL, SQLite, MySQL supported)
- [ ] **Validation**: FluentValidation
- [ ] **Hashing**: BCrypt.Net-Next
- [ ] **UUIDs**: Uuid7 (specific UUID v7 implementation)
- [ ] **DTO Mapping**: Mapperly (compile-time mapping)
- [ ] **Payments**: Stripe.net
- [ ] **Testing**: xUnit + Testcontainers
- [ ] **Serialization**: System.Text.Json

#### Implementation Checklist with Detailed Migration Steps

## Phase 1: Domain Layer Migration

### Step 1.1: Base Infrastructure
- [ ] **Entity Base Class**
  - [ ] Create `Entity<T>` abstract class
  - [ ] Implement `Id` property (Guid)
  - [ ] Implement `Equals()` and `GetHashCode()`
  - [ ] Add `Props` property of type `T`

### Step 1.2: Value Objects (11 total)
- [ ] **ProductStatus** enum (Active, Inactive, Archived)
- [ ] **FeatureStatus** enum (Active, Archived)  
- [ ] **FeatureValueType** enum (Toggle, Numeric, Text)
- [ ] **PlanStatus** enum (Active, Inactive, Archived)
- [ ] **CustomerStatus** enum (Active, Inactive, Suspended, Cancelled)
- [ ] **APIKeyStatus** enum (Active, Inactive, Expired, Revoked)
- [ ] **APIKeyScope** enum (Read, Write, Admin)
- [ ] **SubscriptionStatus** enum (Active, Inactive, Cancelled, Expired, Trial)
- [ ] **OverrideType** enum (Subscription, Customer)
- [ ] **DurationUnit** enum (Day, Week, Month, Year)

### Step 1.3: Domain Entities (8 total)
- [ ] **Product** entity
  - [ ] Properties: Key, DisplayName, Description, Status, Metadata, CreatedAt, UpdatedAt
  - [ ] Methods: Activate(), Deactivate(), Archive(), CanDelete(), UpdateDisplayName()
- [ ] **Feature** entity  
  - [ ] Properties: Key, DisplayName, Description, ValueType, DefaultValue, GroupName, Status, Validator, Metadata, CreatedAt, UpdatedAt
  - [ ] Methods: Archive(), Unarchive(), CanDelete(), UpdateDisplayName(), ValidateValue()
- [ ] **Plan** entity
  - [ ] Properties: ProductKey, Key, DisplayName, Description, Status, DefaultRenewalCycleId, OnExpireTransitionToPlanId, FeatureValues, Metadata, CreatedAt, UpdatedAt
  - [ ] Methods: Activate(), Deactivate(), Archive(), SetFeatureValue(), RemoveFeatureValue(), GetFeatureValue(), CanDelete(), UpdateDisplayName()
- [ ] **Customer** entity
  - [ ] Properties: Key, DisplayName, Email, ExternalBillingId, Status, Metadata, CreatedAt, UpdatedAt
  - [ ] Methods: Activate(), Deactivate(), Suspend(), Cancel(), UpdateEmail(), UpdateDisplayName()
- [ ] **APIKey** entity
  - [ ] Properties: Key, KeyHash, DisplayName, Description, Status, Scope, ExpiresAt, LastUsedAt, IpWhitelist, CreatedBy, Metadata, CreatedAt, UpdatedAt
  - [ ] Methods: Activate(), Deactivate(), Revoke(), Expire(), UpdateLastUsed(), ValidateScope()
- [ ] **Subscription** entity
  - [ ] Properties: Key, CustomerId, PlanId, BillingCycleId, ActivationDate, ExpirationDate, CancellationDate, TrialEndDate, CurrentPeriodStart, CurrentPeriodEnd, AutoRenew, StripeSubscriptionId, Metadata, CreatedAt, UpdatedAt, Status
  - [ ] Methods: Activate(), Cancel(), Expire(), Renew(), SetFeatureOverride(), RemoveFeatureOverride()
- [ ] **BillingCycle** entity
  - [ ] Properties: PlanId, Key, DisplayName, Description, DurationValue, DurationUnit, ExternalProductId, CreatedAt, UpdatedAt
  - [ ] Methods: CalculateNextBillingDate(), ValidateDuration()
- [ ] **SystemConfig** entity
  - [ ] Properties: ConfigKey, ConfigValue, Encrypted, CreatedAt, UpdatedAt
  - [ ] Methods: SetValue(), GetValue(), IsEncrypted()

### Step 1.4: Domain Services (2 total)
- [ ] **FeatureValueResolver** service
  - [ ] ResolveFeatureValue() method
  - [ ] ApplyOverrides() method
- [ ] **SubscriptionRenewalService** service  
  - [ ] CalculateRenewalDate() method
  - [ ] ProcessRenewal() method

## Phase 2: Application Layer Migration

### Step 2.1: DTOs (7 total)
- [ ] **ProductDto**
  - [ ] CreateProductDto with FluentValidation
  - [ ] UpdateProductDto with FluentValidation  
  - [ ] ProductDto interface
  - [ ] ProductFilterDto with FluentValidation
- [ ] **FeatureDto**
  - [ ] CreateFeatureDto with FluentValidation
  - [ ] UpdateFeatureDto with FluentValidation
  - [ ] FeatureDto interface
  - [ ] FeatureFilterDto with FluentValidation
- [ ] **PlanDto**
  - [ ] CreatePlanDto with FluentValidation
  - [ ] UpdatePlanDto with FluentValidation
  - [ ] PlanDto interface
  - [ ] PlanFilterDto with FluentValidation
- [ ] **CustomerDto**
  - [ ] CreateCustomerDto with FluentValidation
  - [ ] UpdateCustomerDto with FluentValidation
  - [ ] CustomerDto interface
  - [ ] CustomerFilterDto with FluentValidation
- [ ] **APIKeyDto**
  - [ ] CreateAPIKeyDto with FluentValidation
  - [ ] UpdateAPIKeyDto with FluentValidation
  - [ ] APIKeyDto interface
  - [ ] APIKeyFilterDto with FluentValidation
- [ ] **SubscriptionDto**
  - [ ] CreateSubscriptionDto with FluentValidation
  - [ ] UpdateSubscriptionDto with FluentValidation
  - [ ] SubscriptionDto interface
  - [ ] SubscriptionFilterDto with FluentValidation
- [ ] **BillingCycleDto**
  - [ ] CreateBillingCycleDto with FluentValidation
  - [ ] UpdateBillingCycleDto with FluentValidation
  - [ ] BillingCycleDto interface
  - [ ] BillingCycleFilterDto with FluentValidation

### Step 2.2: Mappers (7 total) - Using Mapperly
- [ ] **ProductMapper** - Mapperly generated
  - [ ] ToDto(Product) → ProductDto
  - [ ] ToDomain(ProductDb) → Product
  - [ ] ToPersistence(Product) → ProductDb
- [ ] **FeatureMapper** - Mapperly generated
  - [ ] ToDto(Feature) → FeatureDto
  - [ ] ToDomain(FeatureDb) → Feature
  - [ ] ToPersistence(Feature) → FeatureDb
- [ ] **PlanMapper** - Mapperly generated
  - [ ] ToDto(Plan) → PlanDto
  - [ ] ToDomain(PlanDb) → Plan
  - [ ] ToPersistence(Plan) → PlanDb
- [ ] **CustomerMapper** - Mapperly generated
  - [ ] ToDto(Customer) → CustomerDto
  - [ ] ToDomain(CustomerDb) → Customer
  - [ ] ToPersistence(Customer) → CustomerDb
- [ ] **APIKeyMapper** - Mapperly generated
  - [ ] ToDto(APIKey) → APIKeyDto
  - [ ] ToDomain(APIKeyDb) → APIKey
  - [ ] ToPersistence(APIKey) → APIKeyDb
- [ ] **SubscriptionMapper** - Mapperly generated
  - [ ] ToDto(Subscription) → SubscriptionDto
  - [ ] ToDomain(SubscriptionDb) → Subscription
  - [ ] ToPersistence(Subscription) → SubscriptionDb
- [ ] **BillingCycleMapper** - Mapperly generated
  - [ ] ToDto(BillingCycle) → BillingCycleDto
  - [ ] ToDomain(BillingCycleDb) → BillingCycle
  - [ ] ToPersistence(BillingCycle) → BillingCycleDb

### Step 2.3: Repository Interfaces (7 total)
- [ ] **IProductRepository**
  - [ ] Save(Product) → Task
  - [ ] FindById(Guid) → Task<Product?>
  - [ ] FindByKey(string) → Task<Product?>
  - [ ] FindAll(ProductFilterDto?) → Task<IEnumerable<Product>>
  - [ ] Delete(Guid) → Task
  - [ ] Exists(Guid) → Task<bool>
  - [ ] AssociateFeature(Guid, Guid) → Task
  - [ ] DissociateFeature(Guid, Guid) → Task
  - [ ] GetFeaturesByProduct(Guid) → Task<IEnumerable<Guid>>
- [ ] **IFeatureRepository**
  - [ ] Save(Feature) → Task
  - [ ] FindById(Guid) → Task<Feature?>
  - [ ] FindByKey(string) → Task<Feature?>
  - [ ] FindAll(FeatureFilterDto?) → Task<IEnumerable<Feature>>
  - [ ] Delete(Guid) → Task
  - [ ] Exists(Guid) → Task<bool>
- [ ] **IPlanRepository**
  - [ ] Save(Plan) → Task
  - [ ] FindById(Guid) → Task<Plan?>
  - [ ] FindByKey(string, string) → Task<Plan?> (productKey, planKey)
  - [ ] FindAll(PlanFilterDto?) → Task<IEnumerable<Plan>>
  - [ ] Delete(Guid) → Task
  - [ ] Exists(Guid) → Task<bool>
  - [ ] SetFeatureValue(Guid, Guid, string) → Task
  - [ ] RemoveFeatureValue(Guid, Guid) → Task
  - [ ] GetFeatureValues(Guid) → Task<IEnumerable<PlanFeatureValue>>
- [ ] **ICustomerRepository**
  - [ ] Save(Customer) → Task
  - [ ] FindById(Guid) → Task<Customer?>
  - [ ] FindByKey(string) → Task<Customer?>
  - [ ] FindByEmail(string) → Task<Customer?>
  - [ ] FindAll(CustomerFilterDto?) → Task<IEnumerable<Customer>>
  - [ ] Delete(Guid) → Task
  - [ ] Exists(Guid) → Task<bool>
- [ ] **IAPIKeyRepository**
  - [ ] Save(APIKey) → Task
  - [ ] FindById(Guid) → Task<APIKey?>
  - [ ] FindByKey(string) → Task<APIKey?>
  - [ ] FindByKeyHash(string) → Task<APIKey?>
  - [ ] FindAll(APIKeyFilterDto?) → Task<IEnumerable<APIKey>>
  - [ ] Delete(Guid) → Task
  - [ ] Exists(Guid) → Task<bool>
- [ ] **ISubscriptionRepository**
  - [ ] Save(Subscription) → Task
  - [ ] FindById(Guid) → Task<Subscription?>
  - [ ] FindByKey(string) → Task<Subscription?>
  - [ ] FindByCustomerId(Guid) → Task<IEnumerable<Subscription>>
  - [ ] FindAll(SubscriptionFilterDto?) → Task<IEnumerable<Subscription>>
  - [ ] Delete(Guid) → Task
  - [ ] Exists(Guid) → Task<bool>
  - [ ] SetFeatureOverride(Guid, Guid, string, OverrideType) → Task
  - [ ] RemoveFeatureOverride(Guid, Guid) → Task
  - [ ] GetFeatureOverrides(Guid) → Task<IEnumerable<SubscriptionFeatureOverride>>
- [ ] **IBillingCycleRepository**
  - [ ] Save(BillingCycle) → Task
  - [ ] FindById(Guid) → Task<BillingCycle?>
  - [ ] FindByKey(Guid, string) → Task<BillingCycle?> (planId, key)
  - [ ] FindAll(BillingCycleFilterDto?) → Task<IEnumerable<BillingCycle>>
  - [ ] Delete(Guid) → Task
  - [ ] Exists(Guid) → Task<bool>

### Step 2.4: Application Services (9 total)
- [ ] **ProductManagementService**
  - [ ] CreateProduct(CreateProductDto) → Task<ProductDto>
  - [ ] UpdateProduct(string, UpdateProductDto) → Task<ProductDto>
  - [ ] GetProduct(string) → Task<ProductDto?>
  - [ ] ListProducts(ProductFilterDto?) → Task<IEnumerable<ProductDto>>
  - [ ] DeleteProduct(string) → Task
  - [ ] ArchiveProduct(string) → Task<ProductDto>
  - [ ] ActivateProduct(string) → Task<ProductDto>
  - [ ] AssociateFeature(string, string) → Task
  - [ ] DissociateFeature(string, string) → Task
- [ ] **FeatureManagementService**
  - [ ] CreateFeature(CreateFeatureDto) → Task<FeatureDto>
  - [ ] UpdateFeature(string, UpdateFeatureDto) → Task<FeatureDto>
  - [ ] GetFeature(string) → Task<FeatureDto?>
  - [ ] ListFeatures(FeatureFilterDto?) → Task<IEnumerable<FeatureDto>>
  - [ ] DeleteFeature(string) → Task
  - [ ] ArchiveFeature(string) → Task<FeatureDto>
  - [ ] UnarchiveFeature(string) → Task<FeatureDto>
- [ ] **PlanManagementService**
  - [ ] CreatePlan(CreatePlanDto) → Task<PlanDto>
  - [ ] UpdatePlan(string, string, UpdatePlanDto) → Task<PlanDto>
  - [ ] GetPlan(string, string) → Task<PlanDto?>
  - [ ] ListPlans(PlanFilterDto?) → Task<IEnumerable<PlanDto>>
  - [ ] DeletePlan(string, string) → Task
  - [ ] ArchivePlan(string, string) → Task<PlanDto>
  - [ ] ActivatePlan(string, string) → Task<PlanDto>
  - [ ] SetFeatureValue(string, string, string, string) → Task
  - [ ] RemoveFeatureValue(string, string, string) → Task
- [ ] **CustomerManagementService**
  - [ ] CreateCustomer(CreateCustomerDto) → Task<CustomerDto>
  - [ ] UpdateCustomer(string, UpdateCustomerDto) → Task<CustomerDto>
  - [ ] GetCustomer(string) → Task<CustomerDto?>
  - [ ] GetCustomerByEmail(string) → Task<CustomerDto?>
  - [ ] ListCustomers(CustomerFilterDto?) → Task<IEnumerable<CustomerDto>>
  - [ ] DeleteCustomer(string) → Task
  - [ ] ActivateCustomer(string) → Task<CustomerDto>
  - [ ] DeactivateCustomer(string) → Task<CustomerDto>
  - [ ] SuspendCustomer(string) → Task<CustomerDto>
  - [ ] CancelCustomer(string) → Task<CustomerDto>
- [ ] **APIKeyManagementService**
  - [ ] CreateAPIKey(CreateAPIKeyDto) → Task<APIKeyDto>
  - [ ] UpdateAPIKey(string, UpdateAPIKeyDto) → Task<APIKeyDto>
  - [ ] GetAPIKey(string) → Task<APIKeyDto?>
  - [ ] ListAPIKeys(APIKeyFilterDto?) → Task<IEnumerable<APIKeyDto>>
  - [ ] DeleteAPIKey(string) → Task
  - [ ] ActivateAPIKey(string) → Task<APIKeyDto>
  - [ ] DeactivateAPIKey(string) → Task<APIKeyDto>
  - [ ] RevokeAPIKey(string) → Task<APIKeyDto>
  - [ ] ValidateAPIKey(string) → Task<APIKeyDto?>
  - [ ] UpdateLastUsed(string) → Task
- [ ] **SubscriptionManagementService**
  - [ ] CreateSubscription(CreateSubscriptionDto) → Task<SubscriptionDto>
  - [ ] UpdateSubscription(string, UpdateSubscriptionDto) → Task<SubscriptionDto>
  - [ ] GetSubscription(string) → Task<SubscriptionDto?>
  - [ ] ListSubscriptions(SubscriptionFilterDto?) → Task<IEnumerable<SubscriptionDto>>
  - [ ] DeleteSubscription(string) → Task
  - [ ] ActivateSubscription(string) → Task<SubscriptionDto>
  - [ ] CancelSubscription(string) → Task<SubscriptionDto>
  - [ ] RenewSubscription(string) → Task<SubscriptionDto>
  - [ ] SetFeatureOverride(string, string, string, OverrideType) → Task
  - [ ] RemoveFeatureOverride(string, string) → Task
- [ ] **BillingCycleManagementService**
  - [ ] CreateBillingCycle(CreateBillingCycleDto) → Task<BillingCycleDto>
  - [ ] UpdateBillingCycle(string, string, UpdateBillingCycleDto) → Task<BillingCycleDto>
  - [ ] GetBillingCycle(string, string) → Task<BillingCycleDto?>
  - [ ] ListBillingCycles(BillingCycleFilterDto?) → Task<IEnumerable<BillingCycleDto>>
  - [ ] DeleteBillingCycle(string, string) → Task
- [ ] **FeatureCheckerService**
  - [ ] CheckFeature(string, string, string) → Task<FeatureCheckResult>
  - [ ] GetFeatureValue(string, string, string) → Task<string?>
  - [ ] GetCustomerFeatures(string) → Task<IEnumerable<CustomerFeature>>
  - [ ] ValidateFeatureAccess(string, string, string) → Task<bool>
- [ ] **StripeIntegrationService**
  - [ ] CreateCustomer(StripeCustomerDto) → Task<StripeCustomerDto>
  - [ ] UpdateCustomer(string, StripeCustomerDto) → Task<StripeCustomerDto>
  - [ ] CreateSubscription(string, string, StripeSubscriptionDto) → Task<StripeSubscriptionDto>
  - [ ] UpdateSubscription(string, StripeSubscriptionDto) → Task<StripeSubscriptionDto>
  - [ ] CancelSubscription(string) → Task<StripeSubscriptionDto>
  - [ ] SyncFromStripe(string) → Task<SubscriptionDto>

### Step 2.5: Custom Exception Classes
- [ ] **DomainError** - Base domain exception
- [ ] **ValidationError** - Validation failures
- [ ] **NotFoundError** - Entity not found
- [ ] **ConflictError** - Business rule conflicts
- [ ] **UnauthorizedError** - Permission denied
- [ ] **PaymentError** - Payment processing errors

## Phase 3: Infrastructure Layer Migration

### Step 3.1: EF Core Setup (Database Independent)
- [ ] **SubscrioDbContext**
  - [ ] 11 DbSet properties for all entities
  - [ ] OnModelCreating() with entity configurations
  - [ ] Database provider configuration (SQL Server, PostgreSQL, SQLite, MySQL)
- [ ] **Entity Configurations (11 total)**
  - [ ] ProductConfiguration
  - [ ] FeatureConfiguration
  - [ ] ProductFeatureConfiguration
  - [ ] PlanConfiguration
  - [ ] PlanFeatureConfiguration
  - [ ] CustomerConfiguration
  - [ ] APIKeyConfiguration
  - [ ] SubscriptionConfiguration
  - [ ] SubscriptionFeatureOverrideConfiguration
  - [ ] BillingCycleConfiguration
  - [ ] SystemConfigConfiguration

### Step 3.2: Repository Implementations (7 total)
- [ ] **DrizzleProductRepository** → **EFProductRepository**
  - [ ] All 9 interface methods implemented
  - [ ] Proper async/await patterns
  - [ ] Transaction support
- [ ] **DrizzleFeatureRepository** → **EFFeatureRepository**
  - [ ] All 6 interface methods implemented
- [ ] **DrizzlePlanRepository** → **EFPlanRepository**
  - [ ] All 9 interface methods implemented
- [ ] **DrizzleCustomerRepository** → **EFCustomerRepository**
  - [ ] All 8 interface methods implemented
- [ ] **DrizzleAPIKeyRepository** → **EFAPIKeyRepository**
  - [ ] All 9 interface methods implemented
- [ ] **DrizzleSubscriptionRepository** → **EFSubscriptionRepository**
  - [ ] All 10 interface methods implemented
- [ ] **DrizzleBillingCycleRepository** → **EFBillingCycleRepository**
  - [ ] All 6 interface methods implemented

### Step 3.3: Utilities
- [ ] **UUIDv7 Generator**
  - [ ] GenerateId() → Guid (UUID v7)
  - [ ] ValidateId(Guid) → bool
- [ ] **Crypto Utilities**
  - [ ] HashPassword(string) → string
  - [ ] VerifyPassword(string, string) → bool
  - [ ] GenerateAPIKey() → string

### Step 3.4: Database Migrations
- [ ] **Initial Migration**
  - [ ] All 11 tables created
  - [ ] All foreign keys and constraints
  - [ ] All indexes
- [ ] **Schema Installer**
  - [ ] InstallSchema() method
  - [ ] VerifySchema() method
  - [ ] DropSchema() method

## Phase 4: Public API Migration

### Step 4.1: Main Subscrio Class
- [ ] **Subscrio Constructor**
  - [ ] Dependency injection setup
  - [ ] Database initialization
  - [ ] Service initialization
- [ ] **Public Properties (9 total)**
  - [ ] Products → ProductManagementService
  - [ ] Features → FeatureManagementService
  - [ ] Plans → PlanManagementService
  - [ ] Customers → CustomerManagementService
  - [ ] APIKeys → APIKeyManagementService
  - [ ] Subscriptions → SubscriptionManagementService
  - [ ] BillingCycles → BillingCycleManagementService
  - [ ] FeatureChecker → FeatureCheckerService
  - [ ] Stripe → StripeIntegrationService
- [ ] **Schema Management**
  - [ ] InstallSchema(string?) → Task
  - [ ] VerifySchema() → Task<bool>
  - [ ] DropSchema() → Task
- [ ] **Connection Management**
  - [ ] Close() → Task

## Phase 5: Testing Migration

### Step 5.1: Test Infrastructure
- [ ] **xUnit Setup**
  - [ ] Test class base
  - [ ] Database test container setup
  - [ ] Test data factories
- [ ] **E2E Tests (8 test files)**
  - [ ] ProductsE2ETests - All 15 test methods
  - [ ] FeaturesE2ETests - All test scenarios
  - [ ] PlansE2ETests - All test scenarios
  - [ ] CustomersE2ETests - All test scenarios
  - [ ] APIKeysE2ETests - All test scenarios
  - [ ] SubscriptionsE2ETests - All test scenarios
  - [ ] BillingCyclesE2ETests - All test scenarios
  - [ ] FeatureCheckerE2ETests - All test scenarios
- [ ] **Integration Tests**
  - [ ] StripeIntegrationTests
  - [ ] DatabaseMigrationTests
  - [ ] RepositoryTests (7 files)
  - [ ] ServiceTests (9 files)

### Step 5.2: Performance Tests
- [ ] **Benchmark Tests**
  - [ ] Entity creation performance
  - [ ] Query performance
  - [ ] Feature checking performance
  - [ ] Memory usage tests

## Verification Checklist

### Entity Count Verification
- [ ] **Domain Entities**: 8/8 ✅
  - [ ] Product, Feature, Plan, Customer, APIKey, Subscription, BillingCycle, SystemConfig
- [ ] **Value Objects**: 11/11 ✅
  - [ ] All enums from TypeScript version
- [ ] **Domain Services**: 2/2 ✅
  - [ ] FeatureValueResolver, SubscriptionRenewalService

### Application Layer Verification
- [ ] **DTOs**: 7/7 ✅
  - [ ] ProductDto, FeatureDto, PlanDto, CustomerDto, APIKeyDto, SubscriptionDto, BillingCycleDto
- [ ] **Mappers**: 7/7 ✅
  - [ ] All mappers with Mapperly generation
- [ ] **Repository Interfaces**: 7/7 ✅
  - [ ] All interfaces with complete method signatures
- [ ] **Application Services**: 9/9 ✅
  - [ ] All management services with complete methods

### Infrastructure Verification
- [ ] **EF Core Entities**: 11/11 ✅
  - [ ] All database entities configured
- [ ] **Repository Implementations**: 7/7 ✅
  - [ ] All repositories implemented
- [ ] **Database Tables**: 11/11 ✅
  - [ ] All tables created with proper relationships

### API Verification
- [ ] **Public Properties**: 9/9 ✅
  - [ ] All services exposed through main class
- [ ] **Schema Methods**: 3/3 ✅
  - [ ] Install, Verify, Drop schema methods
- [ ] **Connection Management**: 1/1 ✅
  - [ ] Close method implemented

### Test Verification
- [ ] **E2E Test Files**: 8/8 ✅
  - [ ] All entity test scenarios ported
- [ ] **Integration Tests**: All ✅
  - [ ] Stripe, Database, Repository, Service tests
- [ ] **Performance Tests**: All ✅
  - [ ] Benchmark and memory tests

### 2. Python Port

#### Project Structure
```
subscrio/
├── domain/
│   ├── entities/          # 8 entity classes
│   ├── value_objects/     # 11 enum classes
│   ├── services/          # 2 domain services
│   └── base.py           # Entity base class
├── application/
│   ├── dtos/             # 7 DTO classes with validation
│   ├── mappers/          # 7 mapper classes
│   ├── repositories/     # 7 repository interfaces
│   ├── services/         # 9 management services
│   └── errors.py         # Custom exception classes
├── infrastructure/
│   ├── database/         # SQLAlchemy models and migrations
│   ├── repositories/     # 7 repository implementations
│   └── utils.py          # UUID and crypto utilities
└── subscrio.py          # Main public API class
```

#### Technology Stack
- [ ] **Framework**: Python 3.11+
- [ ] **ORM**: SQLAlchemy 2.0 + Alembic
- [ ] **Database**: PostgreSQL (psycopg2-binary)
- [ ] **Validation**: Pydantic v2
- [ ] **Hashing**: bcrypt
- [ ] **UUIDs**: uuid7 (third-party package)
- [ ] **Payments**: stripe-python
- [ ] **Testing**: pytest + pytest-postgresql
- [ ] **Serialization**: Pydantic (built-in)

#### Implementation Checklist
- [ ] **Domain Layer**
  - [ ] Create base `Entity[T]` class with ID and equality
  - [ ] Port 8 domain entities with business methods
  - [ ] Create 11 enum value objects (using Python Enum)
  - [ ] Implement 2 domain services
  - [ ] Add domain validation rules

- [ ] **Application Layer**
  - [ ] Create 7 Pydantic DTO models with validation
  - [ ] Implement 7 mapper classes
  - [ ] Define 7 repository interfaces (Protocol)
  - [ ] Implement 9 management services
  - [ ] Create custom exception classes

- [ ] **Infrastructure Layer**
  - [ ] Setup SQLAlchemy models with 11 tables
  - [ ] Create Alembic migrations
  - [ ] Implement 7 repository classes
  - [ ] Add UUID generation utilities
  - [ ] Setup Stripe integration

- [ ] **Public API**
  - [ ] Create main `Subscrio` class
  - [ ] Implement schema installation/verification
  - [ ] Add connection management

- [ ] **Testing**
  - [ ] Setup pytest with test database
  - [ ] Create E2E tests for all entities
  - [ ] Add integration tests for services
  - [ ] Test Stripe integration

### 3. Rust Port

#### Project Structure
```
src/
├── domain/
│   ├── entities/         # 8 entity structs
│   ├── value_objects/    # 11 enum types
│   ├── services/         # 2 domain services
│   └── base.rs          # Entity trait
├── application/
│   ├── dtos/            # 7 DTO structs with validation
│   ├── mappers/         # 7 mapper traits/impls
│   ├── repositories/    # 7 repository traits
│   ├── services/        # 9 management services
│   └── errors.rs        # Custom error types
├── infrastructure/
│   ├── database/        # SeaORM models and migrations
│   ├── repositories/    # 7 repository implementations
│   └── utils.rs         # UUID and crypto utilities
└── lib.rs              # Main public API
```

#### Technology Stack
- [ ] **Framework**: Rust 1.75+
- [ ] **ORM**: SeaORM
- [ ] **Database**: PostgreSQL (sqlx)
- [ ] **Validation**: validator crate
- [ ] **Hashing**: bcrypt
- [ ] **UUIDs**: uuid v1.0+ with v7 feature
- [ ] **Payments**: stripe-rs
- [ ] **Testing**: tokio-test + testcontainers-rs
- [ ] **Serialization**: serde + serde_json

#### Implementation Checklist
- [ ] **Domain Layer**
  - [ ] Create `Entity<T>` trait with ID and equality
  - [ ] Port 8 domain entities as structs with impl blocks
  - [ ] Create 11 enum value objects
  - [ ] Implement 2 domain services
  - [ ] Add domain validation rules

- [ ] **Application Layer**
  - [ ] Create 7 DTO structs with validator attributes
  - [ ] Implement 7 mapper traits and implementations
  - [ ] Define 7 repository traits
  - [ ] Implement 9 management services
  - [ ] Create custom error types with thiserror

- [ ] **Infrastructure Layer**
  - [ ] Setup SeaORM entities for 11 tables
  - [ ] Create database migrations
  - [ ] Implement 7 repository structs
  - [ ] Add UUID generation utilities
  - [ ] Setup Stripe integration

- [ ] **Public API**
  - [ ] Create main `Subscrio` struct
  - [ ] Implement schema installation/verification
  - [ ] Add connection management

- [ ] **Testing**
  - [ ] Setup tokio-test with testcontainers
  - [ ] Create E2E tests for all entities
  - [ ] Add integration tests for services
  - [ ] Test Stripe integration

### 4. Go Port

#### Project Structure
```
internal/
├── domain/
│   ├── entities/        # 8 entity structs
│   ├── valueobjects/    # 11 enum types
│   ├── services/        # 2 domain services
│   └── entity.go       # Entity interface
├── application/
│   ├── dtos/           # 7 DTO structs with validation
│   ├── mappers/        # 7 mapper functions
│   ├── repositories/   # 7 repository interfaces
│   ├── services/       # 9 management services
│   └── errors.go       # Custom error types
├── infrastructure/
│   ├── database/       # GORM models and migrations
│   ├── repositories/   # 7 repository implementations
│   └── utils/          # UUID and crypto utilities
└── subscrio.go        # Main public API
```

#### Technology Stack
- [ ] **Framework**: Go 1.21+
- [ ] **ORM**: GORM v2
- [ ] **Database**: PostgreSQL (pq driver)
- [ ] **Validation**: go-playground/validator
- [ ] **Hashing**: golang.org/x/crypto/bcrypt
- [ ] **UUIDs**: google/uuid (with custom v7 implementation)
- [ ] **Payments**: stripe-go
- [ ] **Testing**: testify + testcontainers-go
- [ ] **Serialization**: encoding/json (built-in)

#### Implementation Checklist
- [ ] **Domain Layer**
  - [ ] Create `Entity` interface with ID and equality
  - [ ] Port 8 domain entities as structs with methods
  - [ ] Create 11 enum value objects (using constants)
  - [ ] Implement 2 domain services
  - [ ] Add domain validation rules

- [ ] **Application Layer**
  - [ ] Create 7 DTO structs with validator tags
  - [ ] Implement 7 mapper functions
  - [ ] Define 7 repository interfaces
  - [ ] Implement 9 management services
  - [ ] Create custom error types

- [ ] **Infrastructure Layer**
  - [ ] Setup GORM models for 11 tables
  - [ ] Create database migrations
  - [ ] Implement 7 repository structs
  - [ ] Add UUID generation utilities
  - [ ] Setup Stripe integration

- [ ] **Public API**
  - [ ] Create main `Subscrio` struct
  - [ ] Implement schema installation/verification
  - [ ] Add connection management

- [ ] **Testing**
  - [ ] Setup testify with testcontainers
  - [ ] Create E2E tests for all entities
  - [ ] Add integration tests for services
  - [ ] Test Stripe integration

---

## Cross-Language Considerations

### Database Schema Consistency
- [ ] **Table Structure**: Maintain identical 11-table schema across all languages
- [ ] **Column Types**: Map TypeScript types to language-specific equivalents
- [ ] **Constraints**: Preserve all foreign keys, unique constraints, and indexes
- [ ] **Migrations**: Create equivalent migration systems for schema updates

### API Consistency
- [ ] **Public Interface**: Maintain identical method signatures across languages
- [ ] **Error Handling**: Standardize error types and messages
- [ ] **Validation**: Ensure consistent validation rules and error messages
- [ ] **Configuration**: Use similar configuration structures

### Testing Strategy
- [ ] **Test Coverage**: Maintain 100% feature parity with TypeScript tests
- [ ] **E2E Tests**: Port all existing E2E test scenarios
- [ ] **Integration Tests**: Test database operations and external integrations
- [ ] **Performance Tests**: Benchmark against TypeScript implementation

### Documentation
- [ ] **API Documentation**: Generate language-specific API docs
- [ ] **Usage Examples**: Create equivalent quick-start guides
- [ ] **Migration Guide**: Document differences from TypeScript version
- [ ] **Contributing Guide**: Language-specific development setup

### Packaging & Distribution
- [ ] **Package Management**: Use appropriate package managers (NuGet, PyPI, Crates.io, Go modules)
- [ ] **Versioning**: Maintain consistent semantic versioning
- [ ] **CI/CD**: Setup automated testing and deployment pipelines
- [ ] **Compatibility**: Ensure backward compatibility across versions

---

## Implementation Priority

### Phase 1: Core Infrastructure
1. **Database Setup**: Implement ORM, migrations, and basic repository pattern
2. **Domain Layer**: Port all entities, value objects, and domain services
3. **Basic CRUD**: Implement create, read, update, delete operations

### Phase 2: Business Logic
1. **Application Services**: Port all 9 management services
2. **Validation**: Implement comprehensive validation logic
3. **Error Handling**: Create consistent error handling patterns

### Phase 3: Advanced Features
1. **Stripe Integration**: Implement payment processing
2. **Feature Checking**: Port feature evaluation logic
3. **API Keys**: Implement authentication and authorization

### Phase 4: Testing & Polish
1. **E2E Tests**: Port all test scenarios
2. **Documentation**: Create comprehensive docs
3. **Performance**: Optimize and benchmark
4. **Packaging**: Prepare for distribution

---

## Success Criteria

### Functional Parity
- [ ] All 8 entities with identical business logic
- [ ] All 9 application services with same behavior
- [ ] Complete CRUD operations for all entities
- [ ] Stripe integration working identically
- [ ] Feature checking logic identical

### Performance
- [ ] Database operations within 10% of TypeScript performance
- [ ] Memory usage comparable to TypeScript version
- [ ] Startup time under 2 seconds

### Quality
- [ ] 100% test coverage equivalent to TypeScript
- [ ] Zero critical bugs in core functionality
- [ ] Comprehensive error handling
- [ ] Full API documentation

### Developer Experience
- [ ] Easy installation and setup
- [ ] Clear usage examples
- [ ] Comprehensive error messages
- [ ] Good IDE support and autocomplete

This checklist ensures systematic, high-quality ports that maintain architectural consistency and feature parity across all target languages.
