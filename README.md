# anvel-contractor-portal
Private

## Local Development

Run the development server:

```bash
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Environment Variables

Create `.env.local` from `.env.example` and fill in the Supabase values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`.env.local` must not be committed.

## Supabase Health Check

With the dev server running, open:

```text
http://127.0.0.1:3000/api/health/supabase
```

This verifies that the Supabase client can initialize. It does not create database tables or authenticate a user.

## Local Login Testing

Authentication is invite-only. Do not add public registration.

For development testing, create fake users in Supabase Auth, then add matching rows in the `profiles` table. The `id` must match the Supabase Auth user ID.

Example profile rows:

```sql
insert into public.profiles (id, email, full_name, role, is_active)
values
  ('auth-user-id-here', 'admin.test@example.com', 'Admin Test User', 'admin', true),
  ('auth-user-id-here', 'contractor.test@example.com', 'Contractor Test User', 'contractor', true);
```

Use only fake users and fake data in the development Supabase project.

## Password Reset Flow

Users can request a password reset from:

```text
/forgot-password
```

The Supabase recovery email redirects users to:

```text
/reset-password
```

For production, add these URLs in the production Supabase project under
Authentication URL configuration:

```text
https://portal.anvelconsulting.com
https://portal.anvelconsulting.com/reset-password
```

For local development, use the local app URL shown by Next.js, for example:

```text
http://localhost:3000/reset-password
http://localhost:3001/reset-password
```

Password reset uses Supabase Auth only. Do not use or expose the service-role
key for this flow.

## Database Migrations

Migration files live in:

```text
supabase/migrations/
```

Read `supabase/README.md` before applying any SQL to Supabase.

## Current Development Phase

Phase 6 adds the first contractor profile module:

- internal contractor list for `admin` and `operations`;
- read-only contractor detail page;
- contractor-only `My Profile` page;
- Supabase-backed data loading through existing RLS policies.

Profile editing, sensitive bank-data workflows, and audit logging for profile
changes are intentionally left for later phases.

Phase 7 adds read-only project and assignment views:

- internal project list and project detail pages for `admin` and `operations`;
- assigned contractors on project detail pages;
- assigned projects on contractor profile pages;
- contractor-visible assigned project list on `My Profile`;
- admin-only project creation from the Projects page;
- admin-only contractor assignment from project detail pages;
- admin-only assignment status and end-date updates;
- no project editing or rate editing yet.

Phase 8 starts the documents module:

- read-only document metadata view for staff and contractors;
- contractors can only see their own document metadata through existing RLS;
- operations can see metadata but not file names or downloads in the UI;
- private `contractor-documents` storage bucket migration is prepared;
- contractor PDF upload writes to private storage and creates metadata;
- admin and contractors can use short-lived signed PDF download links;
- review actions are intentionally left for the next approved step.

Phase 9 starts the timesheets module:

- read-only monthly timesheet list for staff and contractors;
- read-only timesheet detail page with daily hours entries;
- contractors only receive their own timesheets through existing RLS;
- no task description is required for daily entries;
- contractors can start draft monthly timesheets for assigned projects;
- contractors can add or remove daily worked-day entries while a timesheet is
  draft, rejected, or reopened;
- contractors can submit timesheets for review;
- admin can approve submitted timesheets;
- admin can reject submitted timesheets with a correction reason;
- admin can reopen approved or rejected timesheets for contractor correction;

Phase 10 starts the payment statement / invoice draft module:

- admin can generate one internal payment statement from an approved timesheet;
- statement totals are calculated from approved hours and the assigned hourly rate;
- VAT treatment is read from the contractor profile;
- Cyprus VAT uses 19%; reverse-charge and accountant-review treatments show zero
  VAT pending accountant review;
- the statement is visible to permitted users through existing RLS;
- this is not a legal invoice, self-billing, or payment confirmation.

Phase 11 starts the invoice module:

- contractors can upload the official invoice PDF against a generated payment
  statement;
- invoice PDFs are stored in the private `contractor-invoices` Supabase Storage
  bucket;
- admin and contractors can use short-lived signed invoice download links;
- operations can see invoice metadata but not file names or download links;
- invoice review, correction handling, and payment status are intentionally left
  for later approved steps.

Phase 12 starts accountant exports:

- `admin` and `operations` can open the `Exports` page;
- contractors cannot access the export screen or CSV route;
- the accountant CSV includes supplier, invoice, VAT, project and manual payment
  status fields;
- the export can be filtered by invoice month and invoice status;
- bank details, private file paths and signed document links are deliberately
  excluded from the CSV;
- no new database migration is required for this phase.

Phase 13 starts deployment readiness:

- deployment readiness is documented in `05_DEPLOYMENT_READINESS_CHECKLIST.md`;
- production must use a separate EU Supabase project;
- development/staging may use fake data only;
- production must not use fake Phase 5 or Phase 11 test records;
- Vercel, Supabase and Cloudflare checks must pass before real contractor data
  is added.
