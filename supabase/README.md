# Supabase Setup

This folder contains database migration files for the ANVEL Contractor Portal.

Apply migrations to a development or staging Supabase project first. Use fake data only outside production.

## Current migrations

```text
migrations/202606160001_initial_schema_and_rls.sql
```

This migration creates:

- core business tables for profiles, contractors, projects, documents, timesheets, payment statements, invoices, payments, and audit logs;
- UUID primary keys;
- foreign keys;
- constrained status values;
- EUR-only currency checks for the MVP;
- `created_at` and `updated_at` timestamps;
- common indexes;
- Row Level Security on every business table;
- starter RLS policies for `admin`, `operations`, and `contractor`.

## How to apply in Supabase SQL Editor

1. Open the development Supabase project.
2. Go to `SQL Editor`.
3. Open `supabase/migrations/202606160001_initial_schema_and_rls.sql`.
4. Copy the SQL into the editor.
5. Read it before running.
6. Run it only against the development or staging project.

Do not run this against production until:

- authentication is implemented;
- test users exist;
- contractor isolation has been tested;
- document storage policies have been reviewed;
- no real contractor data is present in staging.

## Manual verification queries

After applying the migration, run:

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
```

Check RLS:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Expected result: every business table should have `rowsecurity = true`.

## Development auth test users

Create test users only in the development Supabase project:

1. Open `Authentication`.
2. Create a fake admin user and a fake contractor user.
3. Copy each user's Auth UUID.
4. Insert matching rows into `public.profiles`.

Example:

```sql
insert into public.profiles (id, email, full_name, role, is_active)
values
  ('replace-with-auth-user-id', 'admin.test@example.com', 'Admin Test User', 'admin', true),
  ('replace-with-auth-user-id', 'contractor.test@example.com', 'Contractor Test User', 'contractor', true);
```

The login flow will reject access to the protected portal shell when a signed-in user does not have an active profile row.

## Security notes

- Do not commit `.env.local`.
- Do not expose the Supabase service role key in browser code.
- Contractors must only access their own records.
- Sensitive document buckets must be private when storage is added.
- Real contractor data belongs only in production after security review.
