# Admin Authentication Setup - JWT Implementation

## Summary of Changes

We've implemented a **unified single-server architecture** where:
- **Admin UI and API** served from the same server (no separate deployment!)
- **Admin UI** uses JWT tokens (obtained via passphrase login)
- **External apps** use API keys
- **One server** on port 3002 handles everything

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Single Server (port 3002)              │
│  ├─ /           → Admin UI (static)     │
│  ├─ /products   → Admin UI (SPA routes) │
│  └─ /api/*      → API endpoints         │
└─────────────────────────────────────────┘
         ↓
    Admin UI sends JWT token
    External apps send API keys
         ↓
┌─────────────────────────────────────────┐
│  Dual Authentication Middleware         │
│  Accepts:                               │
│  - JWT tokens (for admin UI)            │
│  - API keys (for external apps)         │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  @subscrio/core Library                 │
│  → PostgreSQL Database                  │
└─────────────────────────────────────────┘
```

---

## What Was Changed

### 1. API Server (`packages/api`)
- ✅ Added `/api/auth/login` endpoint (validates passphrase, returns JWT)
- ✅ Updated auth middleware to accept API Key OR JWT
- ✅ Added `jsonwebtoken` dependency

### 2. Admin UI (`packages/admin`)
- ✅ Updated `apiClient.ts` to:
  - Use configurable API URL from `.env`
  - Store/send JWT tokens automatically
  - Handle token expiration (redirect to login)
- ✅ Simplified `authStore.ts` (no more Zustand persist)
- ✅ Created `.env.example` with `VITE_API_URL`

### 3. Environment Configuration
- ✅ Added `JWT_SECRET` to `packages/api/env.example`
- ✅ Updated example files with better defaults

---

## Setup Instructions

### Step 1: Install Dependencies

```bash
# Install JWT dependencies for API
cd packages/api
pnpm install
```

### Step 2: Update API Server Environment (ONLY ONE .env NEEDED!)

**Edit your existing `packages/.env` or create it:**
```bash
# Database
DATABASE_URL=postgresql://postgres:Backseat1!@localhost:5432/postgres

# Admin Passphrase (for login)
ADMIN_PASSPHRASE=admin123

# JWT Secret (for signing tokens)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-random-secret-here-change-in-production

# Server
PORT=3002
LOG_LEVEL=error
```

**Important:** Change `JWT_SECRET` to a random string in production!

### Step 3: Development - Two Ways to Run

**Option A: Development Mode (Hot Reload)**

```bash
# Terminal 1 - API Server (port 3002)
pnpm dev:api

# Terminal 2 - Admin UI Dev Server (port 5173)
pnpm dev:admin
```

Admin will be at `http://localhost:5173` with hot module replacement.

**Option B: Production Mode (Single Server)**

```bash
# Build everything
pnpm build

# Run unified server
pnpm start
```

Everything will be at `http://localhost:3002`.

---

## How It Works

### Admin Login Flow

1. **User opens admin UI** (`http://localhost:5173`)
2. **User enters passphrase** (from `ADMIN_PASSPHRASE` env var)
3. **Admin UI calls** `POST /api/auth/login` with passphrase
4. **API validates** passphrase against `ADMIN_PASSPHRASE`
5. **API returns** JWT token (valid for 24 hours)
6. **Admin UI stores** token in `localStorage`
7. **All future API calls** include `Authorization: Bearer <token>` header

### Token Expiration

- Tokens expire after **24 hours**
- When a token expires, user is redirected to login
- User can logout manually (clears token from localStorage)

### External API Access

External apps can still use API keys:
```bash
curl -H "X-API-Key: sk_abc123..." \
  http://localhost:3002/api/products
```

---

## Environment Variables Summary

### Only ONE .env File Needed! (`packages/.env`)
```bash
DATABASE_URL=postgresql://...
ADMIN_PASSPHRASE=your-secure-passphrase
JWT_SECRET=random-secret-for-jwt-signing
PORT=3002
```

**No admin .env needed!** Admin and API are served from the same server.

---

## Testing the Setup

### Development Mode
```bash
# Terminal 1
pnpm dev:api

# Terminal 2  
pnpm dev:admin
```

Open `http://localhost:5173`

### Production Mode
```bash
pnpm build
pnpm start
```

Open `http://localhost:3002`

### 3. Login
Enter your `ADMIN_PASSPHRASE` (default: `admin123`)

### 4. Verify Token
Open browser DevTools → Application → Local Storage
- Should see `subscrio_token` with JWT value

### 5. Make API Calls
Navigate around the admin UI - all requests should work!

---

## Troubleshooting

### "Cannot find module 'jsonwebtoken'"
```bash
cd packages/api
pnpm install
```

### "Invalid passphrase"
- Check `ADMIN_PASSPHRASE` in `packages/.env`
- Restart API server after changing

### "Session expired" loop
- Clear localStorage: DevTools → Application → Local Storage → Clear
- Refresh page and login again

### API calls to wrong URL
- Check `VITE_API_URL` in `packages/admin/.env`
- Restart admin dev server (Vite) after changing

### CORS errors
- Ensure API server has `cors()` middleware enabled
- Both servers should be running

---

## Security Notes

### Development
- Default passphrase (`admin123`) is fine for local dev
- JWT secret can be simple string

### Production
- **Change `ADMIN_PASSPHRASE`** to strong passphrase
- **Generate random `JWT_SECRET`**: `openssl rand -base64 32`
- Use **HTTPS** for all connections
- Store `.env` files securely (never commit to git)

---

## Production Deployment

**Super simple - One server to deploy!**

```bash
# 1. Build everything
pnpm build

# 2. Deploy the API server (includes admin!)
# The admin static files are automatically served

# 3. Start the server
node packages/api/dist/index.js
```

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment options.**

---

## Summary

✅ **Single server** → Admin + API on port 3002  
✅ **No configuration** → No .env for admin, no config files  
✅ **Admin passphrase** → stored server-side only  
✅ **JWT authentication** → 24-hour sessions  
✅ **API key support** → for external integrations  
✅ **Simple deployment** → One build, one server  
✅ **Industry standard** → Battle-tested architecture  

**You're all set!** 🎉

**Next:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guide.

