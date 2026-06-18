# Supabase Setup

This folder contains database migration files for the ANVEL Contractor Portal.

Apply migrations to a development or staging Supabase project first. Use fake data only outside production.

## Current migrations

```text
migrations/202606160001_initial_schema_and_rls.sql
migrations/202606170001_contractor_document_storage.sql
migrations/202606180001_payment_statement_unique_timesheet.sql
migrations/202606180002_contractor_invoice_storage.sql
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

The Phase 8 storage migration creates the private `contractor-documents`
Supabase Storage bucket and starter storage policies:

- admins can manage files in the bucket;
- contractors can read and insert files only under their own contractor path;
- operations do not receive file download access by default;
- only PDF files are allowed;
- the bucket is not public.

The Phase 10 payment statement migration adds a unique index so one approved
timesheet cannot accidentally receive more than one internal payment statement.

The Phase 11 invoice storage migration creates the private
`contractor-invoices` Supabase Storage bucket and starter storage policies:

- admins can manage files in the bucket;
- contractors can read and insert files only under their own contractor path;
- operations do not receive file download access by default;
- only PDF files are allowed;
- the bucket is not public.

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

Check the document storage bucket after applying the Phase 8 migration:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'contractor-documents';
```

Expected result:

- `public` is `false`;
- `file_size_limit` is `10485760`;
- `allowed_mime_types` contains `application/pdf`.

Check the Phase 10 payment statement uniqueness index:

```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'payment_statements'
  and indexname = 'payment_statements_timesheet_id_unique';
```

Expected result: one row named `payment_statements_timesheet_id_unique`.

Check the invoice storage bucket after applying the Phase 11 migration:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'contractor-invoices';
```

Expected result:

- `public` is `false`;
- `file_size_limit` is `10485760`;
- `allowed_mime_types` contains `application/pdf`.

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

## Phase 5 RLS verification

Run this only against the development Supabase project with fake users and fake data.

Required fake users:

```text
admin.test@anvel.local
contractor.test@anvel.local
```

The verification script:

- signs in with the fake admin and contractor users;
- seeds fake contractor, project, document, timesheet, invoice, and payment rows;
- verifies the admin can see both fake contractors;
- verifies the contractor can see only their own records;
- verifies the contractor cannot read audit logs.

Run from the project root:

```powershell
$env:PHASE5_TEST_PASSWORD="your-fake-test-password"
npm.cmd run test:phase5:rls
```

If the fake users have different passwords:

```powershell
$env:PHASE5_ADMIN_PASSWORD="admin-fake-password"
$env:PHASE5_CONTRACTOR_PASSWORD="contractor-fake-password"
npm.cmd run test:phase5:rls
```

If the script says `Invalid login credentials` for one fake user, reset that fake user's password in Supabase Authentication and rerun the script with the matching environment variable.

Expected result:

```text
Phase 5 RLS verification passed with fake development data.
```

Checklist:

- admin can read both fake contractor rows;
- contractor can read only their own contractor row;
- contractor can read only their assigned project;
- contractor can read only their own document metadata;
- contractor can upload PDF files only under their own private storage path;
- contractor cannot upload or download files under another contractor path;
- admin and contractors can use short-lived signed download links;
- contractor can read only their own timesheet and entries;
- contractor can read only their own payment statement, invoice, and payment status;
- contractor cannot read audit logs;
- no service role key is used;
- no real contractor data is inserted.

## Security notes

- Do not commit `.env.local`.
- Do not expose the Supabase service role key in browser code.
- Contractors must only access their own records.
- Sensitive document buckets must be private when storage is added.
- Operations can review document metadata, but file download access is not
  enabled for operations by default.
- Real contractor data belongs only in production after security review.
