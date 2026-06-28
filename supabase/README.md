# Supabase Setup

This folder contains database migration files for the ANVEL Contractor Portal.

Apply migrations to a development or staging Supabase project first. Use fake data only outside production.

## Current migrations

```text
migrations/202606160001_initial_schema_and_rls.sql
migrations/202606170001_contractor_document_storage.sql
migrations/202606180001_payment_statement_unique_timesheet.sql
migrations/202606180002_contractor_invoice_storage.sql
migrations/202606230001_contractor_self_profile_update.sql
migrations/202606270001_document_requirement_defaults.sql
migrations/202606270002_self_billing_invoice_metadata.sql
migrations/202606270003_repair_self_billing_invoice_columns.sql
migrations/202606280001_timesheet_comments_and_document_requirements.sql
migrations/202606280002_outgoing_client_invoices.sql
migrations/202606280003_timesheet_reopen_invoice_cancellation.sql
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

The Phase 26 contractor self-profile migration creates a security-definer RPC
function for contractor self-service profile edits:

- contractors can update only their own non-bank legal and fiscal fields;
- contractor status, email, assignments, rates, and bank account fields are not
  accepted by the function;
- each update writes a `contractor_self_profile_updated` audit log entry.

The Phase 27 document requirement migration seeds default document requirement
configuration.

The self-billing invoice metadata migrations add production-required columns to
`public.invoices`:

- `timesheet_id`;
- `invoice_type`;
- `generated_by`;
- `generated_at`;
- `emailed_at`;
- `email_status`.

`202606270003_repair_self_billing_invoice_columns.sql` is safe to run in
production after earlier migrations. It repairs partial deployments, backfills
existing invoices as `contractor_uploaded`, sets existing `email_status` values
to `not_sent`, recreates the `timesheet_id` foreign key with `on delete set
null`, and adds the self-billing uniqueness indexes.

The Phase 1 outgoing client invoice migration creates:

- admin-only singleton company invoice settings;
- admin-only project billing recipient details;
- immutable outgoing invoice headers and line snapshots;
- atomic, year-based `ANVEL-YYYY-0001` numbering;
- a private `outgoing-invoices` PDF bucket;
- admin-only RLS and storage policies;
- a database check enforcing due date as invoice date plus 30 days.

Contractors and operations users receive no access to sender bank details,
project billing details, outgoing invoice rows, line items, numbering state or
outgoing PDF objects.

The timesheet reopen and invoice cancellation migration:

- repairs contractor updates so comments and submission work from `draft`,
  `rejected`, and `reopened` states without permitting edits to submitted,
  approved, or locked timesheets;
- records the latest reopen reason on the timesheet and retains full reopen
  history in `timesheet_reopen_events`;
- reopens a timesheet and cancels its active self-billing and outgoing invoices
  in one database transaction;
- preserves cancelled invoice rows, PDF paths, invoice numbers, and audit
  history;
- permits one non-cancelled invoice of each type per timesheet, so corrected
  reapproval creates replacement invoices with new numbers;
- reloads the PostgREST schema cache after the new columns and RPC are created.

Phase 12 accountant exports do not add a migration. The export reads existing
invoice, payment statement, project, contractor and payment rows through the
current RLS policies. It deliberately excludes bank details, private storage
paths and signed download links.

Phase 27 admin bank detail editing does not add a migration. The contractor
bank columns already exist in the initial schema. The application restricts
bank detail edits to admins and writes masked-IBAN audit log entries.

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

Check the Phase 26 contractor self-profile update function:

```sql
select proname
from pg_proc
where proname = 'update_own_contractor_profile';
```

Expected result: one row named `update_own_contractor_profile`.

Check the self-billing invoice columns:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'invoices'
  and column_name in (
    'timesheet_id',
    'invoice_type',
    'generated_by',
    'generated_at',
    'emailed_at',
    'email_status'
  )
order by column_name;
```

Expected result: six rows. `invoice_type` and `email_status` should be
`NO` for `is_nullable` and should have defaults.

Check the self-billing indexes:

```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'invoices'
  and indexname in (
    'invoices_timesheet_id_idx',
    'invoices_invoice_type_idx',
    'invoices_self_billing_timesheet_unique_idx',
    'invoices_self_billing_invoice_number_unique_idx'
  )
order by indexname;
```

Expected result: four rows.

Check outgoing billing tables and RLS:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'company_invoice_settings',
    'project_billing_details',
    'outgoing_invoice_sequences',
    'outgoing_invoices',
    'outgoing_invoice_lines'
  )
order by tablename;
```

Expected result: five rows with `rowsecurity = true`.

Check the private outgoing invoice bucket:

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'outgoing-invoices';
```

Expected result: one private, PDF-only bucket.

Check the contractor timesheet update policy after applying
`202606280003_timesheet_reopen_invoice_cancellation.sql`:

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'timesheets'
  and policyname = 'timesheets_update_own_unapproved';
```

Expected result: `qual` permits owned `draft`, `rejected`, and `reopened`
rows. `with_check` permits those same states plus `submitted`.

Check reopen and cancellation columns:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'timesheets'
      and column_name in ('reopened_by', 'reopened_at', 'reopen_reason'))
    or
    (table_name in ('invoices', 'outgoing_invoices')
      and column_name in (
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
        'cancellation_email_status',
        'cancellation_emailed_at'
      ))
  )
order by table_name, column_name;
```

Expected result: three timesheet columns and five cancellation columns on each
invoice table.

Check the replacement-invoice uniqueness indexes:

```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'invoices_self_billing_timesheet_unique_idx',
    'outgoing_invoices_active_timesheet_unique_idx'
  )
order by indexname;
```

Expected result: both indexes are unique and include
`status <> 'cancelled'` in their predicate.

Check the transactional reopen function and history table:

```sql
select proname
from pg_proc
where proname = 'reopen_timesheet_with_invoice_cancellation';

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'timesheet_reopen_events';
```

Expected result: one function row and one history-table row with
`rowsecurity = true`.

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
