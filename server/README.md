# Subscrio Server

Combined server package that serves both the REST API and Admin UI for Subscrio.

**One server. Two authentication methods. Zero configuration.**

## TL;DR

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database details

# 3. Development
npm run dev        # Starts server with HMR

# 4. Open http://localhost:3002
# Login with passphrase from .env (default: admin123)
```

---

## Features

- **REST API**: Full-featured subscription management API
- **Admin UI**: React-based admin interface with HMR
- **Dual Authentication**: Supports both API keys and JWT tokens
- **Single Deployment**: One server serves both API and UI
- **OpenAPI Documentation**: Auto-generated API specification
- **Hot Module Replacement**: Fast development with Vite

---

## Quick Start

### Development Mode (Recommended)

Runs server with hot reload for both API and admin UI:

```bash
npm run dev
```

This starts:
- API server on port 3002
- Admin UI with HMR (served from the same port)

### Production Mode

Build and run production server:

```bash
npm run build   # Build everything
npm start       # Run production server
```

---

## Environment Setup

Create `.env` file in this directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subscrio
ADMIN_PASSPHRASE=admin123
JWT_SECRET=your-random-secret-here
PORT=3002
```

For testing, create `.env.test`:

```bash
cp .env.test.example .env.test
```

**That's it. No other config needed.**

---

## Authentication

The API supports two authentication methods:

### For Admin UI Users:
1. Open admin UI at `http://localhost:3002`
2. Enter passphrase (from `.env`)
3. Get JWT token (valid 24 hours)
4. All API calls use JWT automatically

### For External Apps:
1. Login to admin UI
2. Navigate to Settings → API Keys
3. Create API key
4. Use with `X-API-Key` header

### API Examples

**Using API Key:**
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3002/api/products
```

**Using JWT Token:**
```bash
# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"your-passphrase"}'

# Use token
curl -H "Authorization: Bearer your-jwt-token" \
  http://localhost:3002/api/products
```

---

## Common Commands

```bash
# Development
npm run dev              # Start server with HMR

# Building
npm run build            # Build everything
npm run build:admin      # Build admin UI only

# Production
npm start                # Run production server

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Quality
npm run typecheck        # TypeScript checks
npm run generate:openapi # Generate OpenAPI spec
```

---

## Project Structure

```
server/
├── src/
│   ├── api/
│   │   ├── index.ts              # Main API routes
│   │   ├── middleware/
│   │   │   ├── apiKeyAuth.ts     # Authentication middleware
│   │   │   └── errorHandler.ts   # Global error handler
│   │   └── utils/
│   ├── admin/                    # React admin UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── ...
│   └── index.ts                  # Server entry point
├── scripts/
│   └── generate-openapi.ts       # OpenAPI spec generator
├── tests/
│   ├── api-authentication.test.ts
│   ├── openapi-spec.test.ts
│   └── README.md
├── openapi.json                  # OpenAPI specification
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## API Documentation

The API is documented using OpenAPI 3.0 specification.

**Access the spec:**
- JSON: `http://localhost:3002/openapi.json`
- UI: Import into [Swagger Editor](https://editor.swagger.io/) or [Postman](https://www.postman.com/)

**Updating API Documentation:**

When you add or modify API endpoints:
1. Update the route in `src/api/index.ts`
2. Update the OpenAPI definition in `scripts/generate-openapi.ts`
3. Regenerate: `npm run generate:openapi`
4. Verify: `npm test`

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Subscrio Server (3002)          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐    ┌───────────────┐  │
│  │  Admin UI   │    │   REST API    │  │
│  │  (React)    │    │  (/api/*)     │  │
│  └──────┬──────┘    └───────┬───────┘  │
│         │                   │          │
│         └───────┬───────────┘          │
│                 │                      │
│         ┌───────▼────────┐             │
│         │  @subscrio/core│             │
│         │    (Library)   │             │
│         └───────┬────────┘             │
│                 │                      │
│         ┌───────▼────────┐             │
│         │   PostgreSQL   │             │
│         └────────────────┘             │
└─────────────────────────────────────────┘
```

**Everything runs on one server. No reverse proxy required.**

---

## Deployment

### Build for Production

```bash
npm run build
```

The build process:
1. Builds the React admin UI
2. Compiles TypeScript to JavaScript
3. Output is in `dist/` directory

### Deploy

```bash
# Direct
node dist/index.js

# With PM2
pm2 start dist/index.js --name subscrio

# With Docker (if you have Dockerfile)
docker build -t subscrio .
docker run -p 3002:3002 --env-file .env subscrio
```

### Environment Variables for Production

- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_PASSPHRASE`: Admin login passphrase
- `JWT_SECRET`: Secret for signing JWT tokens
- `PORT`: Server port (default: 3002)

---

## Troubleshooting

**"Cannot find module"**
```bash
npm install
```

**"Invalid passphrase"**
- Check `ADMIN_PASSPHRASE` in `.env`
- Restart server: `npm run dev`

**"Port 3002 already in use"**
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3002
kill -9 <PID>
```

**Database connection errors**
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Check database exists: `createdb subscrio`

---

## Contributing

1. Make changes to API routes in `src/api/index.ts`
2. Update OpenAPI spec in `scripts/generate-openapi.ts`
3. Regenerate spec: `npm run generate:openapi`
4. Add tests in `tests/` directory
5. Run tests: `npm test`
6. Submit PR

See [tests/README.md](./tests/README.md) for detailed testing documentation.

---

## Key Benefits

✅ **Single Server Deployment**
- Admin + API on one port
- No CORS issues
- No configuration

✅ **Dual Authentication**
- JWT for admin UI
- API keys for external apps
- Both work seamlessly

✅ **Hot Module Replacement**
- Fast development cycle
- Instant feedback
- No manual restarts

✅ **Type-Safe**
- Full TypeScript
- Shared types with core
- Compile-time safety

---

## License

MIT
