# ANVEL Contractor Portal

Private invite-only contractor operations portal for ERP UTILITIES CONSULTING SERVICES LTD.

Production domain: `portal.anvelconsulting.com`  
Notification email: `contact@anvelconsulting.com`

## What The Portal Does

- Admins manage contractors, projects, assignments, documents, timesheets, invoices, payments and accountant exports.
- Contractors manage their own profile, documents, monthly timesheets, invoices and payment status visibility.
- Operations users have limited support visibility without full bank detail, rate management or payment approval access.
- Public registration is disabled.
- Currency is EUR only.

## Local Setup

Install dependencies:

```bash
npm.cmd install
```

Create `.env.local` from `.env.example` and fill in:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
RESEND_API_KEY
PORTAL_EMAIL_FROM
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in browser code and never commit `.env.local`.

Use this production sender value:

```text
PORTAL_EMAIL_FROM="ANVEL Consulting <contact@anvelconsulting.com>"
NEXT_PUBLIC_SITE_URL="https://portal.anvelconsulting.com"
```

Run the app:

```bash
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Database And Storage

Migration files live in `supabase/migrations/`.

Apply migrations to a Supabase EU project before using the portal. Required private storage buckets:

- `contractor-documents`
- `contractor-invoices`

Read `supabase/README.md` before applying SQL.

Production self-billing requires the invoice metadata repair migration:

```text
supabase/migrations/202606270003_repair_self_billing_invoice_columns.sql
```

Apply all unapplied migrations in order in the production Supabase SQL Editor,
then run this verification query:

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

Expected result: six rows. `invoice_type` and `email_status` must be non-null
and have defaults.

## Auth And Email

Admin contractor onboarding now creates an invite-only contractor account, profile row and contractor business record from the portal.

Required auth URLs:

```text
https://portal.anvelconsulting.com/auth/callback
https://portal.anvelconsulting.com/reset-password
```

Password reset and invite links pass through `/auth/callback`, exchange the code for a session, then allow the user to set a new password.

For branded production email, configure:

- `RESEND_API_KEY`
- `PORTAL_EMAIL_FROM="ANVEL Consulting <contact@anvelconsulting.com>"`
- Resend domain authentication for `anvelconsulting.com`

The application now rejects invite, reset and invoice emails unless the sender
is exactly:

```text
ANVEL Consulting <contact@anvelconsulting.com>
```

Do not use default-looking platform emails in production.

## Main Workflows

- Admin creates contractor account and invite from `/contractors`.
- Admin edits contractor profile/account details and can offboard access safely.
- Contractor opens a monthly timesheet and enters hours in a calendar view.
- Timesheet dates are validated against assignment start/end dates in the UI and server actions.
- Admin approves a submitted timesheet.
- Approval generates a payment calculation, self-billing invoice record and PDF.
- The self-billing PDF is stored in private invoice storage and emailed to the contractor.
- Contractor-uploaded invoices remain available only as an optional manual fallback.
- Admin records invoice review and can mark an invoice as paid from the contractor profile payment section.
- Contractor payment view shows clean pending status until payment is recorded.
- Admin and contractor can upload contractor documents; admin uploads are linked to the contractor and visible to them.
- Accountant CSV export excludes bank details and private document links.
- Admin Documents, Timesheets, Invoices and Payments workflows start by selecting a contractor, then managing that contractor's records.

## Checks

Run before committing:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run test:business
npm.cmd run build
```

Optional route and accessibility scripts:

```bash
npm.cmd run test:routes
npm.cmd run test:routes:auth
npm.cmd run test:a11y-mobile
```

Route scripts require a running app at `SMOKE_BASE_URL`, which defaults to `http://localhost:3000`.

For authenticated route checks, use dedicated fake-data smoke accounts and either provide temporary browser cookies:

```powershell
$env:SMOKE_BASE_URL="http://localhost:3000"
$env:SMOKE_ADMIN_COOKIE="copy-from-admin-browser-session"
$env:SMOKE_CONTRACTOR_COOKIE="copy-from-contractor-browser-session"
npm.cmd run test:routes:auth
```

Or let the script sign in with Supabase and create the route cookies:

```powershell
$env:SMOKE_BASE_URL="http://localhost:3000"
$env:SMOKE_ADMIN_EMAIL="admin-smoke@example.test"
$env:SMOKE_ADMIN_PASSWORD="replace-with-local-secret"
$env:SMOKE_CONTRACTOR_EMAIL="contractor-smoke@example.test"
$env:SMOKE_CONTRACTOR_PASSWORD="replace-with-local-secret"
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_your-key"
npm.cmd run test:routes:auth
```

Do not commit, paste into chat, or store real production cookies or passwords.

## Operational Data Reset

To restart operational testing without deleting contractors, profiles, auth users or configuration, use:

```bash
$env:ALLOW_OPERATIONAL_DATA_RESET="YES_DELETE_OPERATIONAL_DATA"
npm.cmd run reset:operational-data
```

The script deletes operational documents, timesheets, payment statements, invoices, payments, projects, assignments and related audit logs. It also attempts to remove files from `contractor-documents` and `contractor-invoices`.

It requires:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ALLOW_OPERATIONAL_DATA_RESET=YES_DELETE_OPERATIONAL_DATA
```

Run it only against the intended environment.

## Deployment

Production deployment uses:

- Supabase EU for auth, database, RLS and private file storage.
- Vercel for Next.js hosting.
- Cloudflare DNS for `portal.anvelconsulting.com`.

High-level deployment order:

1. Create or verify the production Supabase EU project.
2. Apply database migrations.
3. Create private storage buckets.
4. Configure auth redirect URLs and branded email.
5. Set Vercel environment variables.
6. Deploy from GitHub through Vercel.
7. Point Cloudflare DNS to the Vercel production deployment.
8. Run production verification before entering real contractor data.

## Email Configuration Checklist

Supabase auth configuration:

```text
Site URL: https://portal.anvelconsulting.com
Redirect URL: https://portal.anvelconsulting.com/auth/callback
Redirect URL: https://portal.anvelconsulting.com/reset-password
```

Vercel environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://portal.anvelconsulting.com
RESEND_API_KEY
PORTAL_EMAIL_FROM=ANVEL Consulting <contact@anvelconsulting.com>
```

Resend/domain setup:

- Add and verify `anvelconsulting.com` in Resend.
- Configure the DNS records Resend provides in Cloudflare.
- Wait until SPF/DKIM/domain status is verified.
- Use `contact@anvelconsulting.com` as the sending mailbox.
- Confirm `RESEND_API_KEY` exists in Vercel for production.
- Confirm `PORTAL_EMAIL_FROM` is exactly `ANVEL Consulting <contact@anvelconsulting.com>`.
- Redeploy Vercel after changing environment variables.
- If email fails, check Vercel server logs for the exact Resend HTTP status and response body.

## Production Test Data Reset

Use this only when you intentionally want to clear the production test data
while preserving:

```text
andres@anvelconsulting.com
andresvelascofdez@gmail.com
```

The script preserves those two profile rows, the admin auth user, the contractor
auth user, and the contractor row linked to
`andresvelascofdez@gmail.com`. It clears operational records and files from the
private document and invoice buckets.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
$env:ALLOW_PRODUCTION_TEST_DATA_RESET="YES_DELETE_TEST_DATA"
npm.cmd run reset:production-test-data
```

Extra Auth users are not deleted by default. To prune them too, add the separate
guard:

```powershell
$env:ALLOW_AUTH_USER_PRUNE="YES_DELETE_EXTRA_AUTH_USERS"
```

Never commit these environment variables. Run the script only from a trusted
machine and only against the intended Supabase project.

## Current Legal/Accounting Assumptions

The portal generates self-billing invoices from approved timesheets. Human confirmation is still required for VAT/accounting policy, invoice wording and any jurisdiction-specific self-billing agreement requirements before relying on the generated PDF as the final statutory document.

Payments remain manual status tracking. The portal does not execute bank payments.
