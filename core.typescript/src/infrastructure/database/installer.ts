import { DrizzleDb } from './drizzle.js';
import { 
  products,
  system_config 
} from './schema.js';
import { sql } from 'drizzle-orm';
import { generateId } from '../utils/uuid.js';
import { now } from '../utils/date.js';
import bcrypt from 'bcryptjs';

/**
 * Schema installer for setting up database
 */
export class SchemaInstaller {
  constructor(private readonly db: DrizzleDb) {}

  /**
   * Install database schema
   */
  async install(adminPassphrase?: string): Promise<void> {
    // Create all tables
    await this.createTables();
    
    // Setup initial system configuration
    await this.setupInitialConfig(adminPassphrase);
  }

  /**
   * Create all database tables
   */
  private async createTables(): Promise<void> {
    // Create tables in dependency order
    
    // Core tables (no dependencies)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS features (
        id UUID PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        value_type TEXT NOT NULL,
        default_value TEXT NOT NULL,
        group_name TEXT,
        status TEXT NOT NULL,
        validator JSONB,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        display_name TEXT,
        email TEXT,
        external_billing_id TEXT UNIQUE,
        status TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id UUID PRIMARY KEY,
        config_key TEXT NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        encrypted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        key_hash TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at TIMESTAMP,
        last_used_at TIMESTAMP,
        ip_whitelist JSONB,
        created_by TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Junction table for products and features
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_features (
        id UUID PRIMARY KEY,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(product_id, feature_id)
      )
    `);

    // Plans table (depends on products)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY,
        product_key TEXT NOT NULL,
        key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        on_expire_transition_to_billing_cycle_key TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(product_key, key)
      )
    `);

    // Billing cycles (depends on plans)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS billing_cycles (
        id UUID PRIMARY KEY,
        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        duration_value INTEGER,
        duration_unit TEXT NOT NULL,
        external_product_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(plan_id, key)
      )
    `);

    // Plan features (junction table)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS plan_features (
        id UUID PRIMARY KEY,
        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(plan_id, feature_id)
      )
    `);


    // Subscriptions (depends on customers and plans)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        billing_cycle_id UUID NOT NULL REFERENCES billing_cycles(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        activation_date TIMESTAMP,
        expiration_date TIMESTAMP,
        cancellation_date TIMESTAMP,
        trial_end_date TIMESTAMP,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
        stripe_subscription_id TEXT UNIQUE,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Subscription feature overrides
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_feature_overrides (
        id UUID PRIMARY KEY,
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        override_type TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(subscription_id, feature_id)
      )
    `);
  }

  /**
   * Verify schema installation
   */
  async verify(): Promise<boolean> {
    try {
      // Try to query the products table
      await this.db.select().from(products).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Setup initial system configuration
   */
  private async setupInitialConfig(adminPassphrase?: string): Promise<void> {
    // Check if admin passphrase already exists
    const existing = await this.db
      .select()
      .from(system_config)
      .where(sql`${system_config.config_key} = 'admin_passphrase_hash'`)
      .limit(1);

    if (existing.length === 0 && adminPassphrase) {
      // Hash the admin passphrase
      const hash = await bcrypt.hash(adminPassphrase, 10);

      // Insert into system_config
      await this.db.insert(system_config).values({
        id: generateId(),
        config_key: 'admin_passphrase_hash',
        config_value: hash,
        encrypted: false,
        created_at: now(),
        updated_at: now()
      });
    }
  }

  /**
   * Drop all tables (use with caution!)
   */
  async dropAll(): Promise<void> {
    await this.db.execute(sql`DROP SCHEMA public CASCADE`);
    await this.db.execute(sql`CREATE SCHEMA public`);
  }
}

