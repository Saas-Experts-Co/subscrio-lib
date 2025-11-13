import { DrizzleDb } from './drizzle.js';
import { 
  products,
  system_config 
} from './schema.js';
import { sql } from 'drizzle-orm';
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
        id BIGSERIAL PRIMARY KEY,
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
        id BIGSERIAL PRIMARY KEY,
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
        id BIGSERIAL PRIMARY KEY,
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
        id BIGSERIAL PRIMARY KEY,
        config_key TEXT NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        encrypted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id BIGSERIAL PRIMARY KEY,
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
        id BIGSERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        feature_id BIGINT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(product_id, feature_id)
      )
    `);

    // Plans table (depends on products)
    // Note: on_expire_transition_to_billing_cycle_id FK added after billing_cycles table is created
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS plans (
        id BIGSERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(product_id, key)
      )
    `);

    // Billing cycles (depends on plans)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS billing_cycles (
        id BIGSERIAL PRIMARY KEY,
        plan_id BIGINT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        duration_value INTEGER,
        duration_unit TEXT NOT NULL,
        external_product_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(plan_id, key)
      )
    `);
    
    // Add on_expire_transition_to_billing_cycle_id column to plans table if it doesn't exist
    // Only add FK if billing_cycles.id is BIGINT (not UUID from old schema)
    await this.db.execute(sql`
      DO $$ 
      DECLARE
        billing_cycles_id_type TEXT;
      BEGIN
        -- Add column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'plans' AND column_name = 'on_expire_transition_to_billing_cycle_id'
        ) THEN
          ALTER TABLE plans ADD COLUMN on_expire_transition_to_billing_cycle_id BIGINT;
        END IF;
        
        -- Check if billing_cycles.id is BIGINT (not UUID from old schema)
        SELECT data_type INTO billing_cycles_id_type
        FROM information_schema.columns
        WHERE table_name = 'billing_cycles' AND column_name = 'id';
        
        -- Only add FK constraint if billing_cycles.id is BIGINT and constraint doesn't exist
        IF billing_cycles_id_type = 'bigint' AND NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'plans_on_expire_transition_to_billing_cycle_id_fkey'
        ) THEN
          ALTER TABLE plans ADD CONSTRAINT plans_on_expire_transition_to_billing_cycle_id_fkey 
            FOREIGN KEY (on_expire_transition_to_billing_cycle_id) 
            REFERENCES billing_cycles(id);
        END IF;
      END $$;
    `);
    
    // Add status column to existing billing_cycles table if it doesn't exist
    await this.db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'billing_cycles' AND column_name = 'status'
        ) THEN
          ALTER TABLE billing_cycles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        END IF;
      END $$;
    `);

    // Plan features (junction table)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS plan_features (
        id BIGSERIAL PRIMARY KEY,
        plan_id BIGINT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        feature_id BIGINT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(plan_id, feature_id)
      )
    `);


    // Subscriptions (depends on customers and plans)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id BIGSERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        plan_id BIGINT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        billing_cycle_id BIGINT NOT NULL REFERENCES billing_cycles(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active',
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        activation_date TIMESTAMP,
        expiration_date TIMESTAMP,
        cancellation_date TIMESTAMP,
        trial_end_date TIMESTAMP,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        stripe_subscription_id TEXT UNIQUE,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Subscription feature overrides
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_feature_overrides (
        id BIGSERIAL PRIMARY KEY,
        subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        feature_id BIGINT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        override_type TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(subscription_id, feature_id)
      )
    `);

    // Add is_archived column to existing subscriptions table if it doesn't exist
    await this.db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'subscriptions' AND column_name = 'is_archived'
        ) THEN
          ALTER TABLE subscriptions ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
      END $$;
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

      // Insert into system_config (id will be auto-generated by BIGSERIAL)
      await this.db.insert(system_config).values({
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
  /**
   * Drop all Subscrio tables (in reverse dependency order)
   */
  async dropAll(): Promise<void> {
    // Drop tables in reverse dependency order to avoid foreign key constraint errors
    // Tables with foreign keys must be dropped before the tables they reference
    
    const tablesToDrop = [
      'subscription_feature_overrides',  // References subscriptions, features
      'subscriptions',                   // References customers, plans, billing_cycles
      'plan_features',                   // References plans, features
      'plans',                           // References products, billing_cycles
      'product_features',                // References products, features
      'api_keys',                        // No foreign keys
      'features',                        // Referenced by product_features, plan_features
      'products',                        // Referenced by product_features, plans
      'customers',                       // Referenced by subscriptions
      'billing_cycles',                  // Referenced by plans, subscriptions
      'system_config'                    // No dependencies
    ];

    for (const table of tablesToDrop) {
      await this.db.execute(sql.raw(`DROP TABLE IF EXISTS ${table} CASCADE`));
    }
  }
}

