# Critical Regression Report: Database Mismatch

## Date: 2026-02-08

## Summary
The application is using **SQLite** instead of the required **NeonDB PostgreSQL** database. This is a critical violation of the infrastructure requirements specified in the project specification.

## Affected Features
- **Feature #2**: Database schema applied correctly (FAILED)
- **Feature #3**: Data persists across server restart (Status unknown - server down during testing)

## Root Cause Analysis

### Specification Requirements
From `app_spec.txt` line 18:
```xml
<database>NeonDB (PostgreSQL)</database>
```

From `app_spec.txt` lines 80-85:
```xml
<Infrastructure>
  - Database connection established to NeonDB PostgreSQL instance
  - Database schema applied correctly via Prisma migrations
  - Data persists across server restarts (no in-memory storage)
  - No mock data patterns in codebase (all data from real database)
  - Backend API queries real database with proper error handling
</Infrastructure>
```

### Current Implementation
- **File**: `prisma/schema.prisma` line 9
- **Content**: `provider = "sqlite"`
- **Environment**: `.env` has `DATABASE_URL="file:./dev.db"`

### Impact
1. The application is NOT using NeonDB PostgreSQL
2. All data is stored in a local SQLite file (`dev.db`)
3. This violates the core infrastructure requirements
4. Any data persistence tests are invalid because they test SQLite, not PostgreSQL

## Required Fix

### Step 1: Obtain NeonDB Credentials
Need the following from the project owner:
- NeonDB PostgreSQL connection string
- Database name
- User credentials

Format should be:
```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

### Step 2: Update Environment Variables
Update `.env` file:
```env
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"
```

### Step 3: Update Prisma Schema
Already done but reverted due to lack of credentials:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 4: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 5: Create and Run Migrations
```bash
npx prisma migrate dev --name init
```

### Step 6: Restart Development Server
```bash
npm run dev
```

### Step 7: Verify Migration
1. Check health endpoint: `GET /api/health`
2. Verify PostgreSQL connection
3. Test data persistence across restarts

## Data Migration Concerns

### Current Data in SQLite
If there's any existing data in `dev.db`, it needs to be migrated:
1. Export data from SQLite
2. Import into PostgreSQL
3. Verify data integrity

### Recommendation
Since this appears to be a development environment, starting fresh with PostgreSQL is acceptable.

## Testing Required After Fix

1. **Feature #1**: Verify database connection shows PostgreSQL
2. **Feature #2**: Verify all tables exist in PostgreSQL with correct schema
3. **Feature #3**: Verify data persists across server restarts in PostgreSQL
4. **Feature #4**: Verify no mock data patterns
5. **Feature #5**: Verify API queries PostgreSQL correctly

## Blocking Issues
- **BLOCKED**: Cannot proceed without NeonDB credentials
- **BLOCKED**: Server is down and needs restart after schema fix

## Next Steps
1. Contact project owner for NeonDB credentials
2. Apply the fix steps above
3. Re-test all infrastructure features
4. Verify full application functionality with PostgreSQL

## Severity: CRITICAL
This regression affects the fundamental data storage architecture and must be fixed before the application can be considered production-ready.
