# 🚀 How to Run Subscrio

## Quick Start (2 Steps)

### 1. Start the API Server

```bash
npm run dev
```

**Expected output:**
```
📁 Loading .env from: C:\src\Subscrio\packages\api\.env
🔗 DATABASE_URL: ✓ Set
✅ Database schema verified
🚀 Subscrio API Server running on http://localhost:3002
   📡 All endpoints available at /api/*
```

### 2. Start the Admin Frontend

**In a new terminal:**

```bash
npm run dev
```

**Expected output:**
```
VITE v5.4.20  ready in XXXms
➜  Local:   http://localhost:3001/
```

### 3. Open Browser

Go to **http://localhost:3001** and login with passphrase: `admin123`

---

## Environment Setup

### First Time Setup

**Create `packages/api/.env`:**

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/postgres
ADMIN_PASSPHRASE=admin123
PORT=3002
```

**That's it!** The admin frontend doesn't need an .env file (it proxies to the API).

---

## Architecture

```
Browser → Admin (port 3001) → API (port 3002) → Core Library → PostgreSQL
```

- **Admin** (3001): React SPA, makes HTTP calls
- **API** (3002): Express server, imports `@subscrio/core` directly
- **Core**: TypeScript library with all business logic
- **Database**: PostgreSQL with auto-created schema

---

## Troubleshooting

### "Port already in use"

Kill the existing process:
```bash
# Find process on port 3002
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Kill it
Stop-Process -Id <PID>
```

### "Failed to connect"

1. Check PostgreSQL is running on port 5432
2. Verify `packages/api/.env` has correct DATABASE_URL
3. Test connection: `npm test` (core tests should pass)

### "Invalid passphrase"

Default is `admin123` - check `packages/api/.env` file

---

## What You Can Do

Once both are running:

1. **Create Products** - Define your subscription products
2. **Add Features** - Create toggle/numeric/text features
3. **Set up Plans** - Create plans with feature values
4. **Add Customers** - Register customer accounts
5. **Create Subscriptions** - Assign customers to plans
6. **Test Features** - Use Feature Checker to debug resolution
7. **Manage Everything** - Full CRUD on all entities

---

## Production Deployment

### Build Everything

```bash
npm run build
```

### Deploy API

```bash
cd packages/api
npm run build
npm start
# Or use PM2, Docker, etc.
```

### Deploy Admin

```bash
cd packages/admin
npm run build
# Serve dist/ folder with any static host
# Configure VITE_API_URL if API is on different domain
```

---

**That's it! Everything is working and ready to use!** 🎉

