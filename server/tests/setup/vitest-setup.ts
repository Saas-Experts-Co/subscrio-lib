// Vitest setup file - runs before each test file IN THE SAME WORKER
// This is where we initialize Subscrio using the database created by global setup
import { config } from 'dotenv';
import { resolve } from 'path';
import { Subscrio } from '@subscrio/core';
import { afterAll } from 'vitest';

// Load environment from workspace root
const packagesRoot = resolve(__dirname, '../../..');
config({ path: resolve(packagesRoot, '.env') });

// Set test environment
process.env.NODE_ENV = 'test';

// Module-level singleton - shared across all tests in this worker
let _testSubscrio: Subscrio | null = null;

// Declare global types
declare global {
  var subscrio: Subscrio;
  var __TEST_DB_NAME__: string;
  var __TEST_CONNECTION_STRING__: string;
}

// Initialize Subscrio with the test database created by global setup
function initializeTestSubscrio(): Subscrio {
  if (_testSubscrio) {
    return _testSubscrio;
  }

  const connectionString = process.env.__TEST_CONNECTION_STRING__;
  
  if (!connectionString) {
    throw new Error(
      'Test database connection string not found.\n' +
      'Global setup may have failed. Check DATABASE_URL in .env file.'
    );
  }

  _testSubscrio = new Subscrio({
    database: { connectionString }
  });

  // Also set it on global for compatibility
  global.subscrio = _testSubscrio;
  global.__TEST_DB_NAME__ = process.env.__TEST_DB_NAME__ || '';
  global.__TEST_CONNECTION_STRING__ = connectionString;

  return _testSubscrio;
}

// Initialize immediately when this file is loaded
initializeTestSubscrio();

// Global cleanup: Close database connection after all tests complete
// This prevents "connection terminated" errors during teardown
afterAll(async () => {
  if (_testSubscrio) {
    try {
      await _testSubscrio.close();
    } catch (error) {
      // Ignore errors during cleanup
    }
    _testSubscrio = null;
  }
});

