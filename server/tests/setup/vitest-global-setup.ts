// Vitest global setup - runs once before all test files
// NOTE: Variables set here don't persist to test files due to worker isolation
// We store database info in environment variables instead
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { setupTestDatabase, teardownTestDatabase, cleanupDanglingTestDatabases } from './database.js';

// Load environment variables from workspace root
const packagesRoot = resolve(__dirname, '../../..');
loadEnv({ path: resolve(packagesRoot, '.env') });

// Set LOG_LEVEL to error for tests to reduce noise
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'error';
}

let testDbName: string;
let testConnectionString: string;

export async function setup() {
  console.log('🏗️  Setting up server test database...');
  
  // Clean up any dangling test databases first
  await cleanupDanglingTestDatabases();
  
  const context = await setupTestDatabase();
  
  // Store connection info in environment variables (persists across workers)
  process.env.__TEST_DB_NAME__ = context.dbName;
  process.env.__TEST_CONNECTION_STRING__ = context.connectionString;
  
  testDbName = context.dbName;
  testConnectionString = context.connectionString;
  
  console.log(`✅ Server test database ready: ${context.dbName}\n`);
  
  // Return provide object for test files
  return {
    provide: {
      testDbName: context.dbName,
      testConnectionString: context.connectionString
    }
  };
}

export async function teardown() {
  if (testDbName) {
    console.log('\n🧹 Tearing down server test database...');
    
    // Suppress "connection terminated" errors during cleanup
    // These are harmless - they occur when we forcibly terminate connections
    // to drop the test database
    const errorHandler = (err: any) => {
      if (err.code === '57P01' || err.message?.includes('terminating connection')) {
        // Suppress expected connection termination errors
        return;
      }
      // Re-throw unexpected errors
      console.error('Unexpected error during teardown:', err);
    };
    
    process.on('uncaughtException', errorHandler);
    process.on('unhandledRejection', errorHandler);
    
    try {
      // Give afterAll hooks time to close connections
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await teardownTestDatabase(testDbName);
      console.log('✅ Server test database cleaned up');
    } finally {
      // Remove error handlers
      process.off('uncaughtException', errorHandler);
      process.off('unhandledRejection', errorHandler);
    }
  }
}

