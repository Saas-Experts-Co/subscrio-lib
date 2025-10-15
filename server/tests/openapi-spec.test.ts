import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Expected routes from src/api/index.ts
 * This list must be manually updated when routes change
 */
const EXPECTED_ROUTES = [
  { method: 'GET', path: '/openapi.json' },
  { method: 'POST', path: '/api/auth/login' },
  // Products
  { method: 'GET', path: '/api/products' },
  { method: 'GET', path: '/api/products/{key}' },
  { method: 'POST', path: '/api/products' },
  { method: 'PUT', path: '/api/products/{key}' },
  { method: 'POST', path: '/api/products/{key}/archive' },
  { method: 'POST', path: '/api/products/{key}/activate' },
  { method: 'DELETE', path: '/api/products/{key}' },
  // Features
  { method: 'GET', path: '/api/features' },
  { method: 'GET', path: '/api/features/{key}' },
  { method: 'GET', path: '/api/products/{productKey}/features' },
  { method: 'POST', path: '/api/features' },
  { method: 'PUT', path: '/api/features/{key}' },
  { method: 'DELETE', path: '/api/features/{key}' },
  // Plans
  { method: 'GET', path: '/api/plans' },
  { method: 'GET', path: '/api/products/{productKey}/plans' },
  { method: 'GET', path: '/api/products/{productKey}/plans/{planKey}' },
  { method: 'POST', path: '/api/plans' },
  { method: 'PUT', path: '/api/products/{productKey}/plans/{planKey}' },
  { method: 'DELETE', path: '/api/products/{productKey}/plans/{planKey}' },
  // Plan Feature Values
  { method: 'POST', path: '/api/products/{productKey}/plans/{planKey}/features/{featureKey}' },
  { method: 'DELETE', path: '/api/products/{productKey}/plans/{planKey}/features/{featureKey}' },
  { method: 'GET', path: '/api/products/{productKey}/plans/{planKey}/features/{featureKey}' },
  { method: 'GET', path: '/api/products/{productKey}/plans/{planKey}/features' },
  // Customers
  { method: 'GET', path: '/api/customers' },
  { method: 'GET', path: '/api/customers/{key}' },
  { method: 'POST', path: '/api/customers' },
  { method: 'PUT', path: '/api/customers/{key}' },
  // Subscriptions
  { method: 'GET', path: '/api/subscriptions' },
  { method: 'GET', path: '/api/subscriptions/{key}' },
  { method: 'GET', path: '/api/customers/{customerKey}/subscriptions' },
  { method: 'POST', path: '/api/subscriptions' },
  { method: 'PUT', path: '/api/subscriptions/{key}' },
  { method: 'POST', path: '/api/subscriptions/{key}/cancel' },
  // Feature Checker
  { method: 'GET', path: '/api/customers/{customerKey}/features/{featureKey}/value' },
  { method: 'GET', path: '/api/customers/{customerKey}/features' },
  // Billing Cycles
  { method: 'GET', path: '/api/products/{productKey}/plans/{planKey}/billing-cycles' },
  { method: 'GET', path: '/api/products/{productKey}/plans/{planKey}/billing-cycles/{key}' },
  { method: 'POST', path: '/api/products/{productKey}/plans/{planKey}/billing-cycles' },
  { method: 'PUT', path: '/api/products/{productKey}/plans/{planKey}/billing-cycles/{key}' },
  { method: 'DELETE', path: '/api/products/{productKey}/plans/{planKey}/billing-cycles/{key}' }
];

describe('OpenAPI Specification Validation', () => {
  test('openapi.json file exists and is valid JSON', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    
    let spec: any;
    try {
      const content = readFileSync(openapiPath, 'utf-8');
      spec = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to load openapi.json. Run: pnpm generate:openapi\nError: ${error}`
      );
    }

    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('openapi.json contains all expected routes from src/api/index.ts', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    const missingRoutes: string[] = [];
    
    for (const expectedRoute of EXPECTED_ROUTES) {
      const path = spec.paths[expectedRoute.path];
      const method = expectedRoute.method.toLowerCase();
      
      if (!path) {
        missingRoutes.push(`${expectedRoute.method} ${expectedRoute.path} - path not found`);
      } else if (!path[method]) {
        missingRoutes.push(`${expectedRoute.method} ${expectedRoute.path} - method not found`);
      }
    }

    if (missingRoutes.length > 0) {
      throw new Error(
        `OpenAPI spec is missing routes:\n${missingRoutes.map(r => `  - ${r}`).join('\n')}\n\n` +
        `Run: pnpm generate:openapi`
      );
    }
  });

  test('openapi.json does not have extra routes not in src/api/index.ts', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    const extraRoutes: string[] = [];
    const expectedSet = new Set(
      EXPECTED_ROUTES.map(r => `${r.method.toUpperCase()} ${r.path}`)
    );
    
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const method of Object.keys(methods as object)) {
        const routeKey = `${method.toUpperCase()} ${path}`;
        if (!expectedSet.has(routeKey)) {
          extraRoutes.push(routeKey);
        }
      }
    }

    if (extraRoutes.length > 0) {
      throw new Error(
        `OpenAPI spec contains extra routes not in src/api/index.ts:\n${extraRoutes.map(r => `  - ${r}`).join('\n')}\n\n` +
        `Either add these routes to src/api/index.ts or remove them from openapi.json`
      );
    }
  });

  test('all protected routes have security defined', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    const unprotectedRoutes: string[] = [];
    
    for (const [path, methods] of Object.entries(spec.paths)) {
      // Skip public routes
      if (path === '/openapi.json' || path === '/api/auth/login') {
        continue;
      }
      
      for (const [method, operation] of Object.entries(methods as object)) {
        const op = operation as any;
        
        // Check if security is defined and not empty
        if (!op.security || op.security.length === 0) {
          unprotectedRoutes.push(`${method.toUpperCase()} ${path}`);
        } else {
          // Verify it has either apiKey or bearerAuth
          const hasApiKey = op.security.some((s: any) => s.apiKey !== undefined);
          const hasBearerAuth = op.security.some((s: any) => s.bearerAuth !== undefined);
          
          if (!hasApiKey && !hasBearerAuth) {
            unprotectedRoutes.push(`${method.toUpperCase()} ${path} - has security but no apiKey or bearerAuth`);
          }
        }
      }
    }

    if (unprotectedRoutes.length > 0) {
      throw new Error(
        `Protected routes missing security configuration:\n${unprotectedRoutes.map(r => `  - ${r}`).join('\n')}\n\n` +
        `Add security: [{ apiKey: [] }, { bearerAuth: [] }] to these routes in openapi.json`
      );
    }
  });

  test('public routes have empty security array', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    const publicRoutes = ['/api/auth/login'];
    const wrongSecurityConfig: string[] = [];
    
    for (const publicPath of publicRoutes) {
      const path = spec.paths[publicPath];
      if (!path) continue;
      
      for (const [method, operation] of Object.entries(path)) {
        const op = operation as any;
        
        // Public routes should have security: [] (empty array)
        if (!op.security || op.security.length > 0) {
          wrongSecurityConfig.push(`${method.toUpperCase()} ${publicPath}`);
        }
      }
    }

    if (wrongSecurityConfig.length > 0) {
      throw new Error(
        `Public routes should have security: []:\n${wrongSecurityConfig.map(r => `  - ${r}`).join('\n')}`
      );
    }
  });

  test('security schemes are properly defined', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    expect(spec.components).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
    
    // Check API Key scheme
    expect(spec.components.securitySchemes.apiKey).toBeDefined();
    expect(spec.components.securitySchemes.apiKey.type).toBe('apiKey');
    expect(spec.components.securitySchemes.apiKey.in).toBe('header');
    expect(spec.components.securitySchemes.apiKey.name).toBe('X-API-Key');
    
    // Check Bearer Auth scheme
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    expect(spec.components.securitySchemes.bearerAuth.bearerFormat).toBe('JWT');
  });

  test('all routes have proper response definitions', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    const missingResponses: string[] = [];
    
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods as object)) {
        const op = operation as any;
        
        // All operations should have responses
        if (!op.responses || Object.keys(op.responses).length === 0) {
          missingResponses.push(`${method.toUpperCase()} ${path} - no responses defined`);
          continue;
        }
        
        // Should have at least 200 response
        if (!op.responses['200']) {
          missingResponses.push(`${method.toUpperCase()} ${path} - missing 200 response`);
        }
        
        // Protected routes should have 401 response
        if (path !== '/openapi.json' && path !== '/api/auth/login') {
          if (!op.responses['401']) {
            missingResponses.push(`${method.toUpperCase()} ${path} - missing 401 response`);
          }
        }
      }
    }

    if (missingResponses.length > 0) {
      throw new Error(
        `Routes with incomplete response definitions:\n${missingResponses.map(r => `  - ${r}`).join('\n')}`
      );
    }
  });

  test('API info is properly configured', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    expect(spec.info.title).toBeDefined();
    expect(spec.info.version).toBeDefined();
    expect(spec.info.description).toBeDefined();
    
    expect(spec.info.title).toBe('Subscrio API');
    expect(spec.info.version).toBe('1.0.0');
  });

  test('servers are properly defined', () => {
    const openapiPath = resolve(__dirname, '../openapi.json');
    const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
    
    expect(spec.servers).toBeDefined();
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.servers.length).toBeGreaterThan(0);
    
    // Should have at least a development server
    const devServer = spec.servers.find((s: any) => 
      s.url && s.url.includes('localhost')
    );
    expect(devServer).toBeDefined();
  });
});

