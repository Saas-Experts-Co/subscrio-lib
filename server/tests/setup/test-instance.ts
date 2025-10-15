// Shared test instance - provides access to the Subscrio instance
import type { Subscrio } from '@subscrio/core';

/**
 * Get the Subscrio instance initialized in vitest-setup.ts
 */
export function getTestSubscrio(): Subscrio {
  const globalAny = global as any;
  
  if (!globalAny.subscrio) {
    throw new Error(
      'Test Subscrio instance not initialized.\n' +
      'This should be set up automatically by vitest-setup.ts.\n' +
      'Make sure DATABASE_URL is set correctly in .env file.'
    );
  }
  
  return globalAny.subscrio;
}

/**
 * Get the test database name
 */
export function getTestDbName(): string {
  return global.__TEST_DB_NAME__ || process.env.__TEST_DB_NAME__ || 'subscrio_server_test';
}

/**
 * Get the test database connection string
 */
export function getTestConnectionString(): string | null {
  return global.__TEST_CONNECTION_STRING__ || process.env.__TEST_CONNECTION_STRING__ || null;
}

