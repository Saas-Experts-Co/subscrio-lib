import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./tests/setup/vitest-global-setup.ts'],
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/index.ts'
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});

