import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import type { Subscrio } from '@subscrio/core';
import { createAuthMiddleware } from '../src/api/middleware/apiKeyAuth.js';
import { errorHandler, asyncHandler } from '../src/api/middleware/errorHandler.js';
import { getTestSubscrio } from './setup/test-instance.js';
import jwt from 'jsonwebtoken';

describe('API Authentication', () => {
  let app: Express;
  let subscrio: Subscrio;
  let validApiKey: string;
  let validJwtToken: string;

  beforeAll(async () => {
    // Get global Subscrio instance created by global setup
    subscrio = getTestSubscrio();

    // Create a test API key
    const apiKeyResult = await subscrio.apiKeys.createAPIKey({
      displayName: 'Test Key',
      scope: 'admin'
    });
    validApiKey = apiKeyResult.plaintextKey;

    // Generate a valid JWT token (must match middleware's JWT_SECRET)
    const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';
    validJwtToken = jwt.sign(
      { role: 'admin', type: 'jwt' },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Set up test Express app
    app = express();
    app.use(express.json());

    // Public route (no auth)
    app.post('/api/auth/login', (req, res) => {
      res.json({ token: 'fake-token' });
    });

    // Protected routes (auth required)
    app.use('/api', (req, res, next) => {
      if (req.path === '/auth/login') {
        return next();
      }
      return createAuthMiddleware(subscrio)(req, res, next);
    });

    // Test protected endpoints
    app.get('/api/products', asyncHandler(async (_req, res) => {
      const products = await subscrio.products.listProducts();
      res.json(products);
    }));

    app.post('/api/products', asyncHandler(async (req, res) => {
      const product = await subscrio.products.createProduct(req.body);
      res.json(product);
    }));

    app.get('/api/features', asyncHandler(async (_req, res) => {
      const features = await subscrio.features.listFeatures();
      res.json(features);
    }));

    app.get('/api/customers', asyncHandler(async (_req, res) => {
      const customers = await subscrio.customers.listCustomers();
      res.json(customers);
    }));

    app.use(errorHandler);
  });

  afterAll(async () => {
    // Clean up test API key
    // Note: We don't close subscrio here - it's managed by global setup
    if (subscrio && validApiKey) {
      try {
        const apiKeys = await subscrio.apiKeys.listAPIKeys();
        const testKey = apiKeys.find(k => k.displayName === 'Test Key');
        if (testKey) {
          await subscrio.apiKeys.revokeAPIKey(testKey.id);
        }
      } catch (error) {
        // Ignore cleanup errors - database might already be torn down
      }
    }
  });

  describe('Public Endpoints', () => {
    test('POST /api/auth/login - allows unauthenticated access', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ passphrase: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('Protected Endpoints - No Authentication', () => {
    test('GET /api/products - returns 401 without authentication', async () => {
      const response = await request(app).get('/api/products');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/products - returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({ key: 'test', displayName: 'Test' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/features - returns 401 without authentication', async () => {
      const response = await request(app).get('/api/features');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/customers - returns 401 without authentication', async () => {
      const response = await request(app).get('/api/customers');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Endpoints - API Key Authentication', () => {
    test('GET /api/products - succeeds with valid API key', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/products - succeeds with valid API key', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('X-API-Key', validApiKey)
        .send({ 
          key: `test-product-${Date.now()}`, 
          displayName: 'Test Product' 
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('key');
      expect(response.body.key).toMatch(/^test-product-/);
    });

    test('GET /api/features - succeeds with valid API key', async () => {
      const response = await request(app)
        .get('/api/features')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('returns 401 with invalid API key', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('X-API-Key', 'invalid-key-12345');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Endpoints - JWT Authentication', () => {
    test('GET /api/products - succeeds with valid JWT token', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${validJwtToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/products - succeeds with valid JWT token', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send({ 
          key: `test-product-jwt-${Date.now()}`, 
          displayName: 'Test Product JWT' 
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('key');
      expect(response.body.key).toMatch(/^test-product-jwt-/);
    });

    test('GET /api/customers - succeeds with valid JWT token', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${validJwtToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('returns 401 with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('returns 401 with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Dual Authentication', () => {
    test('accepts either API key or JWT token', async () => {
      // API Key
      const apiKeyResponse = await request(app)
        .get('/api/products')
        .set('X-API-Key', validApiKey);
      expect(apiKeyResponse.status).toBe(200);

      // JWT Token
      const jwtResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${validJwtToken}`);
      expect(jwtResponse.status).toBe(200);
    });

    test('API key takes precedence when both provided', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('X-API-Key', validApiKey)
        .set('Authorization', `Bearer ${validJwtToken}`);

      expect(response.status).toBe(200);
    });
  });
});

