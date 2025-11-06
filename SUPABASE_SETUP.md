# Supabase Database Setup Guide

This guide explains how to set up all required database tables for the RFP Project.

## Quick Fix for "value too long" Error

If you're getting the error `value too long for type character varying(50)`, run this SQL migration first:

**File**: `supabase-tender-documents-fix.sql`

This will fix the VARCHAR(50) limitations in the `tender_documents` table.

## Complete Database Setup

Run these SQL files **in order** in your Supabase SQL Editor:

### 1. User Authentication (Required)
**File**: `supabase-schema.sql`
- Creates the `users` table for NextAuth.js authentication
- Sets up password hashing with bcrypt
- Configures triggers for `updated_at` timestamps

### 2. Companies & Products (Required for Analysis)
**File**: `supabase-companies-products-schema.sql`
- Creates `companies` table for user company profiles
- Creates `products` table with shape/specifications support
- Sets up proper foreign keys and indexes
- Enables Row Level Security (RLS)

### 3. Tender Documents (Required for Upload)
**File**: `supabase-tender-documents-fix.sql`
- Creates `tender_documents` table with proper VARCHAR sizes
- Stores uploaded PDFs with AI-extracted metadata
- Supports all tender fields including specifications
- Enables RLS for data isolation

### 4. Tender Analysis (Required for AI Analysis)
**File**: `supabase-tender-analysis-schema.sql`
- Creates `tender_analysis` table for caching AI results
- Stores matching products, risks, opportunities, etc.
- Unique constraint on (user_id, tender_id) for caching
- Enables RLS

### 5. Proposals & NvI Questions (Optional)
**File**: `supabase-proposals-schema.sql`
- Creates `proposals` table for generated proposals
- Creates `nvi_questions` table for clarification questions
- Enables RLS with user-level policies

## How to Run SQL Migrations

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy the contents of each SQL file
5. Paste into the SQL editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. Verify "Success. No rows returned" message

## Verification

After running all migrations, verify your tables exist:

```sql
-- Run this to check all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- `users`
- `companies`
- `products`
- `tender_documents`
- `tender_analysis`
- `proposals` (if you ran the proposals schema)
- `nvi_questions` (if you ran the proposals schema)

## Common Issues

### Issue: "relation already exists"
**Solution**: The table already exists. You can:
- Skip that CREATE TABLE statement, OR
- Drop the table first: `DROP TABLE table_name CASCADE;` (⚠️ This deletes all data!)

### Issue: "value too long for type character varying(50)"
**Solution**: Run `supabase-tender-documents-fix.sql` to increase VARCHAR limits

### Issue: RLS policies preventing access
**Solution**: Check that you're using the custom `users` table, not Supabase Auth:
```sql
-- Verify your user ID exists
SELECT id, email FROM users WHERE email = 'your-email@example.com';
```

### Issue: Foreign key violations
**Solution**: Ensure tables are created in the correct order (see order above)

## Environment Variables

After database setup, ensure your `.env` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Field Size Limits

Updated limits to prevent "value too long" errors:

| Field | Old Limit | New Limit |
|-------|-----------|-----------|
| `reference_number` | VARCHAR(50) | VARCHAR(200) |
| `tender_type` | VARCHAR(50) | VARCHAR(200) |
| `cpv_code` | VARCHAR(50) | VARCHAR(100) |
| `mime_type` | VARCHAR(50) | VARCHAR(100) |
| `name` (companies/products) | - | VARCHAR(255) |

## Shape/Specifications Support

The `specifications` field in products and tender_documents uses JSONB to store:
- `shape` - Shape descriptor (e.g., "Round", "Square")
- `housing` - Housing type (e.g., "Cylindrical aluminum")
- `dimensions` - Physical dimensions (e.g., "300 x 200 x 100 mm")
- `mounting` - Mounting options (e.g., "Wall/Ceiling mount")
- `optics` - Optical characteristics (e.g., "Wide beam 120°")
- `weight` - Product weight
- Any other custom specification fields

Example:
```json
{
  "shape": "Round",
  "housing": "Cylindrical aluminum",
  "dimensions": "300 x 200 x 100 mm",
  "mounting": "Wall/Ceiling mount",
  "optics": "Wide beam 120°",
  "weight": "2.5 kg",
  "powerRange": "50-100W",
  "ipRating": "IP65"
}
```

## Need Help?

If you encounter issues:
1. Check the Supabase logs (Dashboard → Database → Logs)
2. Verify RLS policies are correct
3. Ensure your user exists in the `users` table
4. Check foreign key relationships
