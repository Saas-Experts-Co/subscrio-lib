import express from 'express';
import { Subscrio } from '@subscrio/core';
import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware } from './middleware/apiKeyAuth.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from shared packages/.env
const packagesRoot = resolve(__dirname, '../..');
loadEnv({ path: resolve(packagesRoot, '.env') });

console.log('📁 Loading .env from:', resolve(packagesRoot, '.env'));
console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// SERVE ADMIN UI STATIC FILES
// ============================================================================
// Serve admin UI from the same server (no separate deployment needed)
const adminDistPath = resolve(__dirname, '../../admin/dist');
console.log('📂 Admin UI path:', adminDistPath);

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(adminDistPath, {
  index: false // Don't serve index.html here - handle it with catch-all route
}));

// Initialize Subscrio - THIS is where we import the library directly!
const subscrio = new Subscrio({
  database: {
    connectionString: process.env.DATABASE_URL || ''
  }
});

let initialized = false;

async function initializeSubscrio() {
  if (initialized) return;
  
  try {
    const schemaExists = await subscrio.verifySchema();
    if (!schemaExists) {
      const passphrase = process.env.ADMIN_PASSPHRASE || 'admin123';
      await subscrio.installSchema(passphrase);
      console.log('✅ Database schema installed');
    } else {
      console.log('✅ Database schema verified');
    }
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize Subscrio:', error);
    throw error;
  }
}

// OpenAPI Documentation (public - no API key required)
app.get('/openapi.json', asyncHandler(async (_req, res) => {
  const openapiPath = resolve(__dirname, '../openapi.json');
  const openapiSpec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
  res.json(openapiSpec);
}));

// ============================================================================
// AUTHENTICATION ENDPOINT (public - no auth required)
// ============================================================================
// Admin UI login - validates passphrase and returns JWT token
app.post('/api/auth/login', (req, res) => {
  const { passphrase } = req.body;
  const expected = process.env.ADMIN_PASSPHRASE || 'admin123';
  
  if (!passphrase) {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Passphrase is required' 
    });
  }
  
  if (passphrase !== expected) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid passphrase' 
    });
  }
  
  // Generate JWT token (valid for 24 hours)
  const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';
  const token = jwt.sign(
    { role: 'admin', type: 'jwt' },
    jwtSecret,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
});

// ============================================================================
// DUAL AUTHENTICATION MIDDLEWARE
// ============================================================================
// ALL routes below require EITHER:
// - API Key (X-API-Key header) for external integrations
// - JWT token (Authorization: Bearer header) for admin UI
app.use('/api', (req, res, next) => {
  // Skip auth for /api/auth/login endpoint
  if (req.path === '/auth/login') {
    return next();
  }
  return createAuthMiddleware(subscrio)(req, res, next);
});
console.log('🔒 Dual authentication enabled: API Key OR JWT for all /api/* endpoints');

// ============================================================================
// PRODUCTS
// ============================================================================
app.get('/api/products', asyncHandler(async (_req, res) => {
  const products = await subscrio.products.listProducts();
  res.json(products);
}));

app.get('/api/products/:key', asyncHandler(async (req, res) => {
  const product = await subscrio.products.getProduct(req.params.key);
  if (!product) {
    return res.status(404).json({ error: `Product with key '${req.params.key}' not found` });
  }
  res.json(product);
}));

app.post('/api/products', asyncHandler(async (req, res) => {
  const product = await subscrio.products.createProduct(req.body);
  res.json(product);
}));

app.put('/api/products/:key', asyncHandler(async (req, res) => {
  const product = await subscrio.products.updateProduct(req.params.key, req.body);
  res.json(product);
}));

app.post('/api/products/:key/archive', asyncHandler(async (req, res) => {
  await subscrio.products.archiveProduct(req.params.key);
  res.json({ success: true });
}));

app.post('/api/products/:key/activate', asyncHandler(async (req, res) => {
  const product = await subscrio.products.activateProduct(req.params.key);
  res.json(product);
}));

app.delete('/api/products/:key', asyncHandler(async (req, res) => {
  await subscrio.products.deleteProduct(req.params.key);
  res.json({ success: true });
}));

// ============================================================================
// FEATURES
// ============================================================================
app.get('/api/features', asyncHandler(async (_req, res) => {
  const features = await subscrio.features.listFeatures();
  res.json(features);
}));

app.get('/api/features/:key', asyncHandler(async (req, res) => {
  const feature = await subscrio.features.getFeature(req.params.key);
  if (!feature) {
    return res.status(404).json({ error: `Feature with key '${req.params.key}' not found` });
  }
  res.json(feature);
}));

app.get('/api/products/:productKey/features', asyncHandler(async (req, res) => {
  const features = await subscrio.features.getFeaturesByProduct(req.params.productKey);
  res.json(features);
}));

app.post('/api/features', asyncHandler(async (req, res) => {
  const feature = await subscrio.features.createFeature(req.body);
  res.json(feature);
}));

app.put('/api/features/:key', asyncHandler(async (req, res) => {
  const feature = await subscrio.features.updateFeature(req.params.key, req.body);
  res.json(feature);
}));

app.delete('/api/features/:key', asyncHandler(async (req, res) => {
  await subscrio.features.deleteFeature(req.params.key);
  res.json({ success: true });
}));

// ============================================================================
// PLANS
// ============================================================================
app.get('/api/plans', asyncHandler(async (_req, res) => {
  const plans = await subscrio.plans.listPlans();
  res.json(plans);
}));

app.get('/api/products/:productKey/plans', asyncHandler(async (req, res) => {
  const plans = await subscrio.plans.getPlansByProduct(req.params.productKey);
  res.json(plans);
}));

app.get('/api/products/:productKey/plans/:planKey', asyncHandler(async (req, res) => {
  const plan = await subscrio.plans.getPlan(req.params.productKey, req.params.planKey);
  if (!plan) {
    return res.status(404).json({ error: `Plan with key '${req.params.planKey}' not found in product '${req.params.productKey}'` });
  }
  res.json(plan);
}));

app.post('/api/plans', asyncHandler(async (req, res) => {
  const plan = await subscrio.plans.createPlan(req.body);
  res.json(plan);
}));

app.put('/api/products/:productKey/plans/:planKey', asyncHandler(async (req, res) => {
  const plan = await subscrio.plans.updatePlan(req.params.productKey, req.params.planKey, req.body);
  res.json(plan);
}));

app.delete('/api/products/:productKey/plans/:planKey', asyncHandler(async (req, res) => {
  await subscrio.plans.deletePlan(req.params.productKey, req.params.planKey);
  res.json({ success: true });
}));

// ============================================================================
// PLAN FEATURE VALUES
// ============================================================================
app.post('/api/products/:productKey/plans/:planKey/features/:featureKey', asyncHandler(async (req, res) => {
  const { value } = req.body;
  await subscrio.plans.setFeatureValue(req.params.productKey, req.params.planKey, req.params.featureKey, value);
  res.json({ success: true });
}));

app.delete('/api/products/:productKey/plans/:planKey/features/:featureKey', asyncHandler(async (req, res) => {
  await subscrio.plans.removeFeatureValue(req.params.productKey, req.params.planKey, req.params.featureKey);
  res.json({ success: true });
}));

app.get('/api/products/:productKey/plans/:planKey/features/:featureKey', asyncHandler(async (req, res) => {
  const value = await subscrio.plans.getFeatureValue(req.params.productKey, req.params.planKey, req.params.featureKey);
  res.json({ value });
}));

app.get('/api/products/:productKey/plans/:planKey/features', asyncHandler(async (req, res) => {
  const features = await subscrio.plans.getPlanFeatures(req.params.productKey, req.params.planKey);
  res.json(features);
}));

// ============================================================================
// CUSTOMERS
// ============================================================================
app.get('/api/customers', asyncHandler(async (_req, res) => {
  const customers = await subscrio.customers.listCustomers();
  res.json(customers);
}));

app.get('/api/customers/:key', asyncHandler(async (req, res) => {
  const customer = await subscrio.customers.getCustomer(req.params.key);
  if (!customer) {
    return res.status(404).json({ error: `Customer with key '${req.params.key}' not found` });
  }
  res.json(customer);
}));

app.post('/api/customers', asyncHandler(async (req, res) => {
  const customer = await subscrio.customers.createCustomer(req.body);
  res.json(customer);
}));

app.put('/api/customers/:key', asyncHandler(async (req, res) => {
  const customer = await subscrio.customers.updateCustomer(req.params.key, req.body);
  res.json(customer);
}));

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================
app.get('/api/subscriptions', asyncHandler(async (_req, res) => {
  const subscriptions = await subscrio.subscriptions.listSubscriptions();
  res.json(subscriptions);
}));

app.get('/api/subscriptions/:key', asyncHandler(async (req, res) => {
  const subscription = await subscrio.subscriptions.getSubscription(req.params.key);
  if (!subscription) {
    return res.status(404).json({ error: `Subscription with key '${req.params.key}' not found` });
  }
  res.json(subscription);
}));

app.get('/api/customers/:customerKey/subscriptions', asyncHandler(async (req, res) => {
  const subscriptions = await subscrio.subscriptions.getSubscriptionsByCustomer(req.params.customerKey);
  res.json(subscriptions);
}));

app.post('/api/subscriptions', asyncHandler(async (req, res) => {
  const subscription = await subscrio.subscriptions.createSubscription(req.body);
  res.json(subscription);
}));

app.put('/api/subscriptions/:key', asyncHandler(async (req, res) => {
  const subscription = await subscrio.subscriptions.updateSubscription(req.params.key, req.body);
  res.json(subscription);
}));

app.post('/api/subscriptions/:key/cancel', asyncHandler(async (req, res) => {
  await subscrio.subscriptions.cancelSubscription(req.params.key);
  res.json({ success: true });
}));

// ============================================================================
// FEATURE CHECKER
// ============================================================================
app.get('/api/customers/:customerKey/features/:featureKey/value', asyncHandler(async (req, res) => {
  const value = await subscrio.featureChecker.getValue(
    req.params.customerKey,
    req.params.featureKey
  );
  const isEnabled = await subscrio.featureChecker.isEnabled(
    req.params.customerKey,
    req.params.featureKey
  );
  res.json({ value, isEnabled });
}));

app.get('/api/customers/:customerKey/features', asyncHandler(async (req, res) => {
  const allFeatures = await subscrio.featureChecker.getAllFeatures(req.params.customerKey);
  const summary = await subscrio.featureChecker.getFeatureUsageSummary(req.params.customerKey);
  res.json({ 
    allFeatures: Object.fromEntries(allFeatures),
    summary 
  });
}));

// ============================================================================
// BILLING CYCLES
// ============================================================================
app.get('/api/products/:productKey/plans/:planKey/billing-cycles', asyncHandler(async (req, res) => {
  const billingCycles = await subscrio.billingCycles.getBillingCyclesByPlan(
    req.params.productKey,
    req.params.planKey
  );
  res.json(billingCycles);
}));

app.get('/api/products/:productKey/plans/:planKey/billing-cycles/:key', asyncHandler(async (req, res) => {
  const billingCycle = await subscrio.billingCycles.getBillingCycle(
    req.params.productKey,
    req.params.planKey,
    req.params.key
  );
  if (!billingCycle) {
    return res.status(404).json({ error: `Billing cycle with key '${req.params.key}' not found` });
  }
  res.json(billingCycle);
}));

app.post('/api/products/:productKey/plans/:planKey/billing-cycles', asyncHandler(async (req, res) => {
  const billingCycle = await subscrio.billingCycles.createBillingCycle({
    ...req.body,
    productKey: req.params.productKey,
    planKey: req.params.planKey
  });
  res.json(billingCycle);
}));

app.put('/api/products/:productKey/plans/:planKey/billing-cycles/:key', asyncHandler(async (req, res) => {
  const billingCycle = await subscrio.billingCycles.updateBillingCycle(
    req.params.productKey,
    req.params.planKey,
    req.params.key,
    req.body
  );
  res.json(billingCycle);
}));

app.delete('/api/products/:productKey/plans/:planKey/billing-cycles/:key', asyncHandler(async (req, res) => {
  await subscrio.billingCycles.deleteBillingCycle(
    req.params.productKey,
    req.params.planKey,
    req.params.key
  );
  res.json({ success: true });
}));

// ============================================================================
// GLOBAL ERROR HANDLER (must be registered AFTER all routes)
// ============================================================================
app.use(errorHandler);

// ============================================================================
// SPA CATCH-ALL ROUTE (must be last!)
// ============================================================================
// For client-side routing - return index.html for any non-API routes
app.get('*', (_req, res) => {
  res.sendFile(resolve(adminDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3002;

initializeSubscrio()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Subscrio Server running on http://localhost:${PORT}`);
      console.log(`   🎨 Admin UI at http://localhost:${PORT}`);
      console.log(`   📡 API endpoints at http://localhost:${PORT}/api/*`);
      console.log(`   📖 OpenAPI docs at http://localhost:${PORT}/openapi.json`);
      console.log(`   🛡️  Global error handler active`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Subscrio:', error);
    process.exit(1);
  });
