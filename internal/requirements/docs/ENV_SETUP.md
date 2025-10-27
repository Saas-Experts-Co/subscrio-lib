# 🔧 Environment Configuration

All Subscrio packages share a single environment file: **`packages/.env`**

## Setup

**Copy the example file:**

```bash
# On Windows (PowerShell)
Copy-Item packages\env.example packages\.env

# On Mac/Linux
cp packages/env.example packages/.env
```

**Or create manually:**

Create `packages/.env` with:

```bash
# Database Connection (used by @subscrio/core and @subscrio/api)
DATABASE_URL=postgresql://postgres:Backseat1!@localhost:5432/postgres
TEST_DATABASE_URL=postgresql://postgres:Backseat1!@localhost:5432/postgres

# Admin Authentication (used by @subscrio/api)
ADMIN_PASSPHRASE=admin123

# API Server Port (used by @subscrio/api)
PORT=3002

# Logging Level (used by @subscrio/core and @subscrio/api)
LOG_LEVEL=error
```

---

## How Each Package Uses It

### @subscrio/core
- **Loads:** `packages/.env` in test setup
- **Uses:** `TEST_DATABASE_URL`, `LOG_LEVEL`
- **Purpose:** Run E2E tests against PostgreSQL

### @subscrio/api
- **Loads:** `packages/.env` on startup
- **Uses:** `DATABASE_URL`, `ADMIN_PASSPHRASE`, `PORT`
- **Purpose:** Connect to database, authenticate admins, listen on port

### @subscrio/admin
- **Loads:** Nothing! (browser app)
- **Uses:** None
- **Purpose:** Pure frontend, makes HTTP calls to API

---

## Why One Shared File?

✅ **Single source of truth** - One place to configure everything
✅ **Consistency** - All packages use same database
✅ **Simplicity** - Don't duplicate DATABASE_URL across 3 files
✅ **Easier development** - Change once, affects all packages
✅ **Less confusion** - No wondering which .env file to edit

---

## File Locations

```
Subscrio/
├── packages/
│   ├── .env              ← CREATE THIS (shared by all)
│   ├── env.example       ← Copy from here
│   ├── core/
│   │   └── tests/setup/vitest-setup.ts  ← Loads packages/.env
│   ├── api/
│   │   └── src/index.ts  ← Loads packages/.env
│   └── admin/
│       └── (no .env needed)
```

---

## Checklist

- [ ] PostgreSQL running on port 5432
- [ ] Created `packages/.env` from `packages/env.example`
- [ ] Updated DATABASE_URL with your credentials
- [ ] Set ADMIN_PASSPHRASE to something secure
- [ ] Run `npm test` - should pass (13/13)
- [ ] Run `npm run dev` - should start on port 3002
- [ ] Run `npm run dev` - should start on port 3001
- [ ] Open http://localhost:3001 and login

---

**Once `packages/.env` exists, everything will work!** 🚀

