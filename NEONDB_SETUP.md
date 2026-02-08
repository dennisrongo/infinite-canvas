# NeonDB PostgreSQL Setup Guide

## Critical: This Application Requires NeonDB PostgreSQL

The project specification explicitly requires **NeonDB PostgreSQL**, not SQLite. Follow these steps to set up the correct database.

## Step 1: Create NeonDB Account

1. Go to https://console.neon.tech/
2. Sign up for a free account
3. Create a new project

## Step 2: Get Connection String

1. In your NeonDB project, go to "Connection Details"
2. Copy the connection string (format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`)
3. Keep this secure - it contains your database credentials

## Step 3: Update Environment Variables

Create or update `.env` file in the project root:

```env
DATABASE_URL="postgresql://your-username:your-password@your-host.neon.tech/neondb?sslmode=require"
```

**IMPORTANT:**
- Replace the connection string with your actual NeonDB credentials
- Keep `?sslmode=require` at the end for secure connections
- Never commit `.env` to git (it's already in `.gitignore`)

## Step 4: Install PostgreSQL Dependencies

If you don't have the PostgreSQL Prisma client:

```bash
npm install @prisma/client --save-dev
npx prisma generate
```

## Step 5: Run Database Migrations

Create and apply the database schema:

```bash
npx prisma migrate dev --name init
```

This will:
- Create all tables in your NeonDB database
- Generate the Prisma client with PostgreSQL types
- Apply the correct schema

## Step 6: Verify Connection

Start the development server:

```bash
npm run dev
```

Test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-02-08T..."
}
```

## Step 7: Verify Schema

You can verify the tables were created correctly:

```bash
npx prisma studio
```

This opens Prisma Studio where you can:
- View all tables
- See table structures
- Manually inspect data

## Common Issues

### Issue: "Error: P3001"
**Cause**: Migration failed or database doesn't exist
**Solution**: Verify DATABASE_URL is correct and database exists in NeonDB

### Issue: "Error: Authentication failed"
**Cause**: Invalid credentials in DATABASE_URL
**Solution**: Double-check username and password in connection string

### Issue: "Error: Connection timeout"
**Cause**: Firewall or network issue
**Solution**: Ensure SSL mode is enabled (`?sslmode=require`)

## Migration from SQLite (If Needed)

If you have existing data in SQLite that needs to migrate:

1. **Export SQLite data**:
   ```bash
   npx prisma db pull --schema=./prisma/schema-sqlite.prisma
   ```

2. **Convert to PostgreSQL format** (manual process)

3. **Import to PostgreSQL**:
   ```bash
   npx prisma db push
   ```

**Note**: For development, it's usually easier to start fresh with PostgreSQL.

## Verification Checklist

- [ ] NeonDB account created
- [ ] Project created in NeonDB console
- [ ] Connection string copied
- [ ] `.env` file updated with PostgreSQL connection string
- [ ] `prisma/schema.prisma` has `provider = "postgresql"`
- [ ] `npx prisma migrate dev` ran successfully
- [ ] Health endpoint returns "connected"
- [ ] Prisma Studio shows all tables
- [ ] Registration/test endpoint works with PostgreSQL

## Support

If you encounter issues:
- Check NeonDB documentation: https://neon.tech/docs
- Check Prisma PostgreSQL docs: https://www.prisma.io/docs/reference/database-reference/postgresql
- Review error messages carefully - they usually indicate the exact problem
