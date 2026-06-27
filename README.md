# ANVEL Contractor Portal

Private invite-only contractor operations portal for ERP UTILITIES CONSULTING SERVICES LTD.

Production domain: `portal.anvelconsulting.com`  
Notification email: `portal@anvelconsulting.com`

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

## Auth And Email

Admin contractor onboarding now creates an invite-only contractor account, profile row and contractor business record from the portal.

Required auth URLs:

```text
https://portal.anvelconsulting.com/auth/callback
https://portal.anvelconsulting.com/reset-password
```

Password reset and invite links pass through `/auth/callback`, exchange the code for a session, then allow the user to set a new password.

For branded production email, configure either:

- `RESEND_API_KEY` and `PORTAL_EMAIL_FROM`, or
- a branded SMTP/template setup in the auth provider dashboard.

Do not use default-looking platform emails in production.

## Main Workflows

- Admin creates contractor account and invite from `/contractors`.
- Admin edits contractor profile/account details and can offboard access safely.
- Contractor opens a monthly timesheet and enters hours in a calendar view.
- Timesheet dates are validated against assignment start/end dates in the UI and server actions.
- Admin approves, rejects or reopens submitted timesheets.
- Admin generates payment statements only when a single valid assignment rate covers all worked dates.
- Contractor uploads official invoice PDF where manual invoice mode is used.
- Admin records invoice review and can mark an invoice as paid from `/payments`.
- Contractor payment view shows clean pending status until payment is recorded.
- Admin and contractor can upload contractor documents; admin uploads are linked to the contractor and visible to them.
- Accountant CSV export excludes bank details and private document links.

## Checks

Run before committing:

```bash
npm.cmd run lint
npm.cmd run test:business
npm.cmd run build
```

Optional route and accessibility scripts:

```bash
npm.cmd run test:routes
npm.cmd run test:routes:auth
npm.cmd run test:a11y-mobile
```

Some route scripts require a running local server and configured test credentials.

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

## Current Legal/Accounting Assumptions

Payment statements are operational calculations. Contractor-uploaded invoices remain available as the manual/legal invoice workflow.

Self-billing invoice generation still requires human legal/accounting confirmation before it is treated as the legal production invoice process. Do not represent generated payment statements as legal self-billing invoices until that confirmation is complete.
