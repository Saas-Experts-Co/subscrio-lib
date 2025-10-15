# Server API Tests

This directory contains tests for the Subscrio REST API layer.

## Test Structure

```
tests/
├── setup/
│   └── vitest-setup.ts          # Test environment setup
├── api-authentication.test.ts    # Authentication and authorization tests
├── openapi-spec.test.ts         # OpenAPI specification validation
└── README.md                    # This file
```

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

## Test Categories

### 1. Authentication Tests (`api-authentication.test.ts`)

Verifies that:
- All API endpoints (except `/api/auth/login`) require authentication
- API Key authentication works correctly
- JWT token authentication works correctly
- Invalid credentials are rejected
- Both authentication methods can be used interchangeably

**Key assertions:**
- Unauthenticated requests return `401 Unauthorized`
- Valid API key grants access
- Valid JWT token grants access
- Invalid credentials are rejected

### 2. OpenAPI Specification Tests (`openapi-spec.test.ts`)

Ensures the `openapi.json` file accurately reflects the actual API implementation.

**Validates:**
- ✅ All routes in `src/api/index.ts` are documented in `openapi.json`
- ✅ No extra undocumented routes in `openapi.json`
- ✅ All protected routes have security configurations
- ✅ Public routes have empty security arrays
- ✅ Security schemes are properly defined
- ✅ All routes have proper response definitions
- ✅ API metadata (title, version, servers) is configured

**If tests fail:**

```bash
# Regenerate OpenAPI spec
pnpm generate:openapi

# Then run tests again
pnpm test
```

## Environment Setup

Tests require a PostgreSQL database. Create `.env.test`:

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subscrio_test
ADMIN_PASSPHRASE=test-admin-passphrase
JWT_SECRET=test-jwt-secret-key
LOG_LEVEL=error
```

## Maintaining Tests

### When Adding New API Endpoints

1. **Add route to `src/api/index.ts`**
   ```typescript
   app.get('/api/new-endpoint', asyncHandler(async (req, res) => {
     // implementation
   }));
   ```

2. **Update `tests/openapi-spec.test.ts`**
   
   Add route to `EXPECTED_ROUTES`:
   ```typescript
   const EXPECTED_ROUTES = [
     // ... existing routes
     { method: 'GET', path: '/api/new-endpoint' }
   ];
   ```

3. **Regenerate OpenAPI spec**
   ```bash
   pnpm generate:openapi
   ```

4. **Run tests to verify**
   ```bash
   pnpm test
   ```

### When Modifying Existing Endpoints

1. Update the endpoint in `src/api/index.ts`
2. Update the corresponding entry in `scripts/generate-openapi.ts`
3. Regenerate: `pnpm generate:openapi`
4. Run tests: `pnpm test`

## CI/CD Integration

Tests are designed to run in CI pipelines:

```yaml
# .github/workflows/test.yml
test-api:
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: postgres
      ports:
        - 5432:5432
  steps:
    - run: pnpm install
    - run: pnpm --filter @subscrio/server test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/subscrio_test
```

## Test Coverage

Run with coverage to ensure API endpoints are tested:

```bash
pnpm test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Troubleshooting

### Tests fail with "Database connection error"

Ensure PostgreSQL is running and `DATABASE_URL` is correct:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Tests fail with "openapi.json not found"

Generate the OpenAPI spec:
```bash
pnpm generate:openapi
```

### Authentication tests fail

1. Check that database schema is installed
2. Verify `JWT_SECRET` environment variable is set
3. Ensure API key generation works in core library

### OpenAPI validation fails

1. Compare `EXPECTED_ROUTES` in test with actual routes in `src/api/index.ts`
2. Ensure route paths match exactly (including parameter names)
3. Regenerate OpenAPI spec: `pnpm generate:openapi`

## Best Practices

1. **Keep tests fast**: Use the same database instance for all tests in a suite
2. **Clean up**: Tests clean up created resources in `afterAll` hooks
3. **Isolate tests**: Each test should be independent and not rely on others
4. **Update OpenAPI spec**: Always regenerate after route changes
5. **Test security**: Every new endpoint should have authentication tests

