import { SubscrioConfig } from './config/types.js';
import { initializeDatabase, DrizzleDb, closeDatabase } from './infrastructure/database/drizzle.js';
import { SchemaInstaller } from './infrastructure/database/installer.js';

// Repositories
import { IProductRepository } from './application/repositories/IProductRepository.js';
import { IFeatureRepository } from './application/repositories/IFeatureRepository.js';
import { IPlanRepository } from './application/repositories/IPlanRepository.js';
import { ICustomerRepository } from './application/repositories/ICustomerRepository.js';
import { IAPIKeyRepository } from './application/repositories/IAPIKeyRepository.js';
import { ISubscriptionRepository } from './application/repositories/ISubscriptionRepository.js';
import { IBillingCycleRepository } from './application/repositories/IBillingCycleRepository.js';

// Repository implementations
import { DrizzleProductRepository } from './infrastructure/repositories/DrizzleProductRepository.js';
import { DrizzleFeatureRepository } from './infrastructure/repositories/DrizzleFeatureRepository.js';
import { DrizzlePlanRepository } from './infrastructure/repositories/DrizzlePlanRepository.js';
import { DrizzleCustomerRepository } from './infrastructure/repositories/DrizzleCustomerRepository.js';
import { DrizzleAPIKeyRepository } from './infrastructure/repositories/DrizzleAPIKeyRepository.js';
import { DrizzleSubscriptionRepository } from './infrastructure/repositories/DrizzleSubscriptionRepository.js';
import { DrizzleBillingCycleRepository } from './infrastructure/repositories/DrizzleBillingCycleRepository.js';

// Services
import { ProductManagementService } from './application/services/ProductManagementService.js';
import { FeatureManagementService } from './application/services/FeatureManagementService.js';
import { PlanManagementService } from './application/services/PlanManagementService.js';
import { CustomerManagementService } from './application/services/CustomerManagementService.js';
import { APIKeyManagementService } from './application/services/APIKeyManagementService.js';
import { SubscriptionManagementService } from './application/services/SubscriptionManagementService.js';
import { BillingCycleManagementService } from './application/services/BillingCycleManagementService.js';
import { FeatureCheckerService } from './application/services/FeatureCheckerService.js';
import { StripeIntegrationService } from './application/services/StripeIntegrationService.js';

// Domain services
import { FeatureValueResolver } from './domain/services/FeatureValueResolver.js';
import { SubscriptionRenewalService } from './domain/services/SubscriptionRenewalService.js';

/**
 * Main Subscrio class - entry point for the library
 */
export class Subscrio {
  private readonly db: DrizzleDb;
  private readonly installer: SchemaInstaller;
  
  // Repositories (private)
  private readonly productRepo: IProductRepository;
  private readonly featureRepo: IFeatureRepository;
  private readonly planRepo: IPlanRepository;
  private readonly customerRepo: ICustomerRepository;
  private readonly apiKeyRepo: IAPIKeyRepository;
  private readonly subscriptionRepo: ISubscriptionRepository;
  private readonly billingCycleRepo: IBillingCycleRepository;
  
  // Public services
  public readonly products: ProductManagementService;
  public readonly features: FeatureManagementService;
  public readonly plans: PlanManagementService;
  public readonly customers: CustomerManagementService;
  public readonly apiKeys: APIKeyManagementService;
  public readonly subscriptions: SubscriptionManagementService;
  public readonly billingCycles: BillingCycleManagementService;
  public readonly featureChecker: FeatureCheckerService;
  public readonly stripe: StripeIntegrationService;

  constructor(config: SubscrioConfig) {
    // Initialize database
    this.db = initializeDatabase(config.database);
    this.installer = new SchemaInstaller(this.db);

    // Initialize repositories
    this.productRepo = new DrizzleProductRepository(this.db);
    this.featureRepo = new DrizzleFeatureRepository(this.db);
    this.planRepo = new DrizzlePlanRepository(this.db);
    this.customerRepo = new DrizzleCustomerRepository(this.db);
    this.apiKeyRepo = new DrizzleAPIKeyRepository(this.db);
    this.subscriptionRepo = new DrizzleSubscriptionRepository(this.db);
    this.billingCycleRepo = new DrizzleBillingCycleRepository(this.db);

    // Initialize domain services
    new FeatureValueResolver();
    new SubscriptionRenewalService();

    // Initialize application services
    this.products = new ProductManagementService(this.productRepo, this.featureRepo);
    this.features = new FeatureManagementService(this.featureRepo, this.productRepo);
    this.plans = new PlanManagementService(
      this.planRepo,
      this.productRepo,
      this.featureRepo,
      this.billingCycleRepo
    );
    this.customers = new CustomerManagementService(this.customerRepo);
    this.apiKeys = new APIKeyManagementService(this.apiKeyRepo);
    this.subscriptions = new SubscriptionManagementService(
      this.subscriptionRepo,
      this.customerRepo,
      this.planRepo,
      this.billingCycleRepo,
      this.featureRepo,
      this.productRepo
    );
    this.billingCycles = new BillingCycleManagementService(this.billingCycleRepo, this.planRepo);
    this.featureChecker = new FeatureCheckerService(
      this.subscriptionRepo,
      this.planRepo,
      this.featureRepo,
      this.customerRepo,
      this.productRepo
    );
    this.stripe = new StripeIntegrationService(
      this.subscriptionRepo,
      this.customerRepo,
      this.planRepo,
      this.billingCycleRepo
    );
  }

  /**
   * Install database schema
   */
  async installSchema(adminPassphrase?: string): Promise<void> {
    await this.installer.install(adminPassphrase);
  }

  /**
   * Verify schema installation
   */
  async verifySchema(): Promise<boolean> {
    return await this.installer.verify();
  }

  /**
   * Drop all database tables (WARNING: Destructive!)
   */
  async dropSchema(): Promise<void> {
    await this.installer.dropAll();
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await closeDatabase();
  }
}