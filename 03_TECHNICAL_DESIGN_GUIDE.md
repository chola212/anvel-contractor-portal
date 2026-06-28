# Technical Design Guide — ANVEL Contractor Portal

Project: **ANVEL Contractor Portal**  
Company: **ERP UTILITIES CONSULTING SERVICES LTD**  
Repository: `anvel-contractor-portal`  
Production domain: `portal.anvelconsulting.com`  
Notification email: `contact@anvelconsulting.com`  
Audience: second-year Computer Science student learning full-stack development

---

## 1. Purpose of the portal

The ANVEL Contractor Portal is a private internal web application used to manage freelancers/subcontractors after they have already been selected and contractually accepted.

The portal exists to answer operational questions such as:

- Has the contractor completed their legal and fiscal profile?
- Have they uploaded the required signed documents?
- Which projects are they assigned to?
- How many hours did they work in a month?
- Has ANVEL approved those hours?
- What amount should the contractor invoice?
- Has the official invoice been uploaded?
- Has the invoice been checked and paid?
- What data should be exported for the accountant?

It is not intended to manage the technical work performed by the contractor. Task details belong in the client's Jira, project manager workflow, or client timesheet tool.

---

## 2. What the MVP includes

The MVP includes:

1. Authentication
2. User roles
3. Contractor profiles
4. Legal/fiscal/bank data
5. Signed PDF document upload
6. Project records
7. Contractor-to-project assignment
8. Monthly timesheets
9. Admin approval/rejection
10. Payment statement / invoice draft calculation
11. Official invoice upload by contractor
12. Invoice review by admin
13. Payment status tracking
14. CSV/Excel export for accountant
15. Basic audit log
16. Responsive web design

---

## 3. What the MVP excludes

The MVP must not include:

- candidate sourcing;
- CV database for candidates;
- AI scoring of freelancers;
- automatic job matching;
- public sign-up;
- client portal;
- detailed task reporting;
- SAP ticket/task details;
- SAP source code;
- SAP credentials;
- production client data;
- automatic bank payments;
- automatic bank payments;
- electronic signature integration;
- passport/ID document requirement by default;
- payment card data;
- marketing/analytics trackers.

These exclusions matter because the portal must remain simple, secure and legally controlled.

---

## 4. Main users and roles

### 4.1 Admin

The Admin is ANVEL management.

Admin can:

- see all contractors;
- create and edit projects;
- assign contractors to projects;
- review documents;
- approve/reject timesheets;
- review invoices;
- mark invoices as paid;
- export accountant data;
- access audit logs;
- manage statuses.

### 4.2 Operations

Operations is an optional role for support work.

Operations can:

- view onboarding status;
- view non-sensitive profile information;
- review whether documents are missing;
- review timesheet status;
- help prepare reports.

Operations should not be able to:

- see full bank details by default;
- download sensitive legal documents by default;
- mark payments as paid;
- change rates;
- change RLS/security settings.

For MVP, the role can be designed but not actively used.

### 4.3 Contractor

The Contractor is the freelancer/subcontractor.

Contractor can:

- view own profile;
- update own legal/fiscal/bank details where allowed;
- upload own documents;
- view assigned projects;
- enter own timesheets;
- submit monthly timesheets;
- see approval/rejection status;
- see expected payable amount;
- upload own official invoice;
- see payment status.

Contractor must never see another contractor's data.

---

## 5. Technology stack explained

### 5.1 Next.js

Next.js is the web framework.

It provides:

- pages and routes;
- server-side rendering;
- React components;
- API/server functionality;
- production build optimisation.

This project will use the **App Router**, which organises routes inside the `app/` folder.

### 5.2 TypeScript

TypeScript is JavaScript with types.

Example:

```ts
const hours: number = 7.5;
```

Why it matters:

- catches many mistakes before runtime;
- makes code easier to understand;
- helps with autocomplete;
- makes interviews easier because it shows modern frontend/backend discipline.

### 5.3 Tailwind CSS

Tailwind is used for styling.

Instead of writing a lot of custom CSS classes, you apply utility classes directly:

```tsx
<div className="rounded-lg border bg-white p-4">
  Contractor documents
</div>
```

It is fast and works well with component-based design.

### 5.4 shadcn/ui

shadcn/ui provides reusable UI components such as buttons, dialogs, tables and forms.

Important: it must be customised. The app should not look like a default template.

Use it for:

- buttons;
- inputs;
- dialogs;
- dropdowns;
- tables;
- badges;
- form controls.

### 5.5 Supabase

Supabase provides:

- PostgreSQL database;
- authentication;
- storage;
- Row Level Security;
- dashboard and SQL editor.

For this project, Supabase must be created in an EU region.

### 5.6 PostgreSQL

PostgreSQL is the relational database.

A relational database stores structured data in tables.

Example table:

```text
contractors
  id
  legal_name
  email
  country
  vat_number
```

Tables can be connected with foreign keys.

### 5.7 Supabase Auth

Supabase Auth manages user login.

It stores authentication users in `auth.users`.

The application should have a separate `profiles` table linked to `auth.users`.

### 5.8 Row Level Security

RLS means Row Level Security.

It is a database security feature that controls which rows a user can read or change.

Example idea:

- admin can select all timesheets;
- contractor can only select timesheets where `contractor_user_id = auth.uid()`.

This is important because frontend checks are not enough. A malicious user could bypass the frontend. RLS protects the data at the database level.

### 5.9 Supabase Storage

Supabase Storage stores files.

In this project, files include:

- signed contracts;
- VAT certificates;
- registration documents;
- official invoices.

Buckets must be private. Sensitive files must not be publicly accessible.

### 5.10 Vercel

Vercel hosts the Next.js app.

It connects to GitHub and automatically deploys changes.

### 5.11 Cloudflare

Cloudflare manages DNS and can proxy web traffic.

It will be used for:

- `portal.anvelconsulting.com`;
- DNS records;
- HTTPS/TLS support;
- basic web security.

---

## 6. High-level architecture

```text
User Browser
    |
    | HTTPS
    v
Cloudflare DNS / Proxy
    |
    v
Vercel Next.js Application
    |
    | Supabase client / server calls
    v
Supabase EU Project
    |-- Auth
    |-- PostgreSQL Database with RLS
    |-- Private Storage Buckets
```

### Explanation

1. The user opens `portal.anvelconsulting.com`.
2. Cloudflare routes the request.
3. Vercel serves the Next.js application.
4. The app authenticates the user through Supabase Auth.
5. The app reads/writes data in Supabase PostgreSQL.
6. RLS ensures the user only accesses permitted rows.
7. Uploaded PDFs are stored in private Supabase Storage buckets.

---

## 7. Application routes

Suggested route structure:

```text
/
/login
/dashboard
/contractors
/contractors/[id]
/projects
/projects/[id]
/documents
/timesheets
/timesheets/[id]
/invoices
/invoices/[id]
/payments
/exports
/settings
```

Contractor-specific routes can use the same pages with role-based filtering, or a separate route group:

```text
/(contractor)/my-profile
/(contractor)/my-documents
/(contractor)/my-timesheets
/(contractor)/my-invoices
```

For learning, route groups can be introduced after the first simple layout works.

---

## 8. Suggested folder structure

```text
src/
  app/
    layout.tsx
    page.tsx
    login/
    dashboard/
    contractors/
    projects/
    documents/
    timesheets/
    invoices/
    payments/
    exports/
    settings/
  components/
    layout/
    ui/
    forms/
    tables/
    status/
  lib/
    supabase/
    auth/
    validation/
    formatting/
    permissions/
    audit/
  server/
    actions/
    queries/
  types/
  styles/
  constants/
```

### Explanation

- `app/`: routes and pages.
- `components/`: reusable UI pieces.
- `lib/`: shared functions and configuration.
- `server/`: server-only actions and database operations.
- `types/`: TypeScript types.
- `constants/`: statuses, VAT treatment options, role names.

---

## 9. Core business rules

### 9.1 Contractor status

Suggested contractor statuses:

- `draft`
- `invited`
- `active`
- `paused`
- `offboarded`

### 9.2 Project status

Suggested project statuses:

- `planned`
- `active`
- `paused`
- `closed`

### 9.3 Timesheet status

Suggested statuses:

- `draft`
- `submitted`
- `approved`
- `rejected`
- `reopened`
- `locked`

Business rules:

- contractors enter only days actually worked;
- no workload agreement is required in the portal;
- no task description is required;
- if no work was performed on a day, no row is required;
- monthly timesheets are submitted as a whole;
- approved timesheets become locked;
- admin can reopen a timesheet if correction is needed.

### 9.4 Invoice status

Suggested statuses:

- `pending_upload`
- `uploaded`
- `checked`
- `correction_required`
- `approved_for_payment`
- `paid`
- `on_hold`

### 9.5 Document status

Suggested statuses:

- `missing`
- `uploaded`
- `approved`
- `rejected`
- `expired`

---

## 10. Data model overview

This is the proposed database model.

The exact SQL can be implemented in migrations.

### 10.1 `profiles`

Stores application-level information for each authenticated user.

```text
id uuid primary key references auth.users(id)
email text not null
full_name text
role text not null check role in ('admin', 'operations', 'contractor')
is_active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Why this table exists:

- Supabase Auth stores login credentials.
- The application still needs role and business profile information.

### 10.2 `contractors`

Stores contractor legal and business profile.

```text
id uuid primary key default gen_random_uuid()
profile_id uuid references profiles(id)
legal_name text not null
trading_name text
email text not null
phone text
country text
supplier_type text check supplier_type in ('limited_company', 'self_employed', 'sole_trader', 'other')
company_registration_number text
vat_number text
tax_number text
fiscal_address text
vat_treatment text
bank_account_holder text
iban text
swift_bic text
bank_currency text default 'EUR'
status text not null default 'draft'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Sensitive fields:

- IBAN;
- SWIFT/BIC;
- tax data;
- legal documents linked to contractor.

Access should be restricted.

### 10.3 `projects`

Stores projects managed by ANVEL.

```text
id uuid primary key default gen_random_uuid()
name text not null
client_label text
country text
start_date date
end_date date
status text not null default 'planned'
currency text not null default 'EUR'
admin_notes text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

`client_label` can be generic. Avoid storing confidential client details if not needed.

### 10.4 `contractor_projects`

Connects contractors to projects.

```text
id uuid primary key default gen_random_uuid()
contractor_id uuid not null references contractors(id)
project_id uuid not null references projects(id)
hourly_rate numeric(12,2) not null
currency text not null default 'EUR'
sales_rate numeric(12,2)
start_date date
end_date date
status text not null default 'active'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
unique(contractor_id, project_id, start_date)
```

Important:

- `hourly_rate` is visible to the contractor.
- `sales_rate` is admin-only and used to estimate margin.

### 10.5 `document_requirements`

Optional table to define what documents are required by supplier type.

```text
id uuid primary key default gen_random_uuid()
supplier_type text
name text not null
is_required boolean not null default true
requires_expiry_date boolean not null default false
created_at timestamptz not null default now()
```

Examples:

- Signed MSA;
- Signed NDA;
- Signed SOW;
- VAT certificate;
- Company registration certificate;
- Business/tax registration proof;
- Professional Indemnity certificate.

### 10.6 `contractor_documents`

Stores metadata for uploaded documents.

```text
id uuid primary key default gen_random_uuid()
contractor_id uuid not null references contractors(id)
document_requirement_id uuid references document_requirements(id)
document_type text not null
file_path text not null
file_name text not null
mime_type text
file_size_bytes bigint
status text not null default 'uploaded'
expiry_date date
reviewed_by uuid references profiles(id)
reviewed_at timestamptz
review_comment text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Do not store file contents in the database. Store files in Supabase Storage and keep only metadata here.

### 10.7 `timesheets`

One timesheet per contractor, project and month.

```text
id uuid primary key default gen_random_uuid()
contractor_id uuid not null references contractors(id)
project_id uuid not null references projects(id)
year int not null
month int not null check (month >= 1 and month <= 12)
status text not null default 'draft'
submitted_at timestamptz
approved_by uuid references profiles(id)
approved_at timestamptz
rejected_by uuid references profiles(id)
rejected_at timestamptz
rejection_reason text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
unique(contractor_id, project_id, year, month)
```

### 10.8 `timesheet_entries`

Stores daily hours.

```text
id uuid primary key default gen_random_uuid()
timesheet_id uuid not null references timesheets(id) on delete cascade
work_date date not null
hours numeric(5,2) not null check (hours >= 0 and hours <= 24)
note text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
unique(timesheet_id, work_date)
```

Business rule:

- note is optional;
- if no work was performed, no row is required.

### 10.9 `payment_statements`

Stores expected payable amount calculated from approved hours.

```text
id uuid primary key default gen_random_uuid()
timesheet_id uuid not null references timesheets(id)
contractor_id uuid not null references contractors(id)
project_id uuid not null references projects(id)
total_hours numeric(8,2) not null
hourly_rate numeric(12,2) not null
net_amount numeric(12,2) not null
vat_treatment text not null
vat_amount numeric(12,2) not null default 0
gross_amount numeric(12,2) not null
currency text not null default 'EUR'
created_at timestamptz not null default now()
created_by uuid references profiles(id)
```

Approved timesheets generate self-billing invoice records and PDFs. The payment statement values remain the calculation basis for those invoices and for payment tracking.

### 10.10 `invoices`

Stores official invoice metadata uploaded by contractor.

```text
id uuid primary key default gen_random_uuid()
payment_statement_id uuid references payment_statements(id)
contractor_id uuid not null references contractors(id)
invoice_number text not null
invoice_date date not null
net_amount numeric(12,2) not null
vat_amount numeric(12,2) not null default 0
gross_amount numeric(12,2) not null
currency text not null default 'EUR'
file_path text not null
file_name text not null
status text not null default 'uploaded'
reviewed_by uuid references profiles(id)
reviewed_at timestamptz
review_comment text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### 10.11 `payments`

Tracks payment status manually.

```text
id uuid primary key default gen_random_uuid()
invoice_id uuid not null references invoices(id)
status text not null default 'pending'
payment_date date
payment_reference text
paid_amount numeric(12,2)
currency text not null default 'EUR'
internal_note text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Payment statuses:

- `pending`
- `approved`
- `paid`
- `on_hold`

### 10.12 `audit_logs`

Tracks sensitive actions.

```text
id uuid primary key default gen_random_uuid()
actor_profile_id uuid references profiles(id)
action text not null
entity_type text not null
entity_id uuid
metadata jsonb
created_at timestamptz not null default now()
```

Examples of actions:

- `document_uploaded`
- `document_approved`
- `timesheet_submitted`
- `timesheet_approved`
- `invoice_uploaded`
- `payment_marked_paid`
- `bank_details_updated`

---

## 11. RLS design principles

RLS is mandatory for all business tables.

### 11.1 Helper functions

Recommended helper function:

```sql
create or replace function public.current_user_role()
returns text
language sql
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;
```

Then policies can check:

```sql
public.current_user_role() = 'admin'
```

### 11.2 Admin access

Admin can normally read and manage all business data.

Example concept:

```sql
using (public.current_user_role() = 'admin')
```

### 11.3 Contractor access

Contractor access must be limited to own records.

For example, a contractor can select their own contractor row:

```sql
using (profile_id = auth.uid())
```

For timesheets, access should be indirect through contractor ownership.

Concept:

```sql
using (
  exists (
    select 1
    from contractors c
    where c.id = timesheets.contractor_id
    and c.profile_id = auth.uid()
  )
)
```

### 11.4 Operations access

Operations can have read-only access to selected non-sensitive data.

Be careful before giving Operations access to:

- bank details;
- full legal documents;
- payment data;
- sensitive audit logs.

---

## 12. Storage design

### 12.1 Buckets

Suggested private buckets:

```text
contractor-documents
contractor-invoices
```

Do not create public buckets for sensitive documents.

### 12.2 File paths

Use structured paths:

```text
contractors/{contractor_id}/documents/{document_id}-{safe_filename}.pdf
contractors/{contractor_id}/invoices/{invoice_id}-{safe_filename}.pdf
```

### 12.3 File rules

Allowed files in MVP:

- PDF only, or PDF plus image formats if needed later;
- max file size, for example 10 MB;
- no executable files;
- store original filename in metadata;
- generate safe internal file path.

### 12.4 File access

- Contractor can upload own documents.
- Contractor can download own documents.
- Admin can download all documents.
- Operations download access should be limited.
- Use signed URLs with short expiry or authenticated downloads.

---

## 13. Timesheet design

### 13.1 Monthly timesheet

A contractor creates one timesheet per project per month.

Example:

```text
Contractor: Test Contractor One
Project: SAP Utilities Support
Month: September 2026
Status: Draft
```

Entries:

```text
2026-09-03 | 8.00 hours
2026-09-04 | 6.50 hours
2026-09-08 | 7.00 hours
```

No row is required for days with no work.

### 13.2 Validation rules

- hours cannot be negative;
- hours cannot be above 24;
- warning if above 10 hours;
- warning if weekend;
- no duplicate date for the same timesheet;
- no editing after approval unless reopened;
- only admin can approve/reject;
- contractor can submit own draft timesheet.

### 13.3 Why no task description is required

The portal is for ANVEL supplier payment control, not project management.

The actual task details belong to:

- client project manager;
- client Jira;
- client timesheet tool;
- project-specific process.

This keeps the portal simple and avoids storing unnecessary project data.

---

## 14. Invoice and payment design

### 14.1 Payment statement

After timesheet approval, the system calculates:

```text
approved hours × hourly rate = net amount
```

Then VAT is calculated depending on `vat_treatment`.

Example EU reverse charge:

```text
Total hours: 128
Rate: EUR 50.00
Net amount: EUR 6,400.00
VAT: EUR 0.00, reverse charge
Gross amount: EUR 6,400.00
```

Example Cyprus supplier:

```text
Total hours: 128
Rate: EUR 50.00
Net amount: EUR 6,400.00
VAT 19%: EUR 1,216.00
Gross amount: EUR 7,616.00
```

### 14.2 Official invoice

The contractor must upload the official invoice.

The portal does not legally issue the invoice on behalf of the contractor.

### 14.3 Invoice mismatch

If uploaded invoice values do not match the expected payment statement, admin can mark:

```text
Correction required
```

---

## 15. VAT treatment options

Use controlled options:

```text
EU supplier with valid VAT number — reverse charge
Cyprus supplier — Cyprus VAT 19%
Non-EU supplier — accountant review
EU supplier without VAT number — accountant review required
```

For MVP, do not automate VIES validation. It can be added later.

---

## 16. Accountant export

The MVP export should include:

```text
supplier name
country
VAT number
invoice number
invoice date
net amount
VAT amount
gross amount
VAT treatment
payment status
payment date
project
currency
```

CSV is enough for MVP.

Excel export can be added using a library later.

---

## 17. UI/UX design rules

### 17.1 Visual style

The portal should look like a practical professional backoffice.

Use:

- neutral background;
- compact tables;
- clear labels;
- restrained accent colour;
- readable spacing;
- status badges;
- simple navigation;
- responsive layouts.

Avoid:

- generic startup SaaS look;
- gradients;
- emojis;
- marketing copy;
- big empty cards;
- unnecessary illustrations.

### 17.2 Main admin navigation

Suggested items:

- Dashboard
- Contractors
- Projects
- Documents
- Timesheets
- Invoices
- Payments
- Exports
- Settings

### 17.3 Contractor navigation

Suggested items:

- My Profile
- My Documents
- My Timesheets
- My Invoices
- Payment Status

### 17.4 Responsive design

The app must work on:

- desktop;
- laptop;
- tablet;
- mobile.

Priority is desktop/tablet. Mobile must be usable, but the app is not a mobile app.

---

## 18. Forms and validation

Use:

- React Hook Form for form state;
- Zod for validation schemas.

Example validation concepts:

```text
legal_name: required
email: valid email
hours: number between 0 and 24
invoice_date: required date
currency: EUR in MVP
```

Validation should happen both:

- in the browser for user experience;
- on the server/database for security.

---

## 19. Error handling

Use clear, practical errors.

Good:

```text
This timesheet is already approved and cannot be edited.
The invoice total does not match the approved payment statement.
This document type only accepts PDF files.
```

Bad:

```text
Something went wrong.
Oops!
Error 500.
```

Technical details can be logged, but user-facing messages should be understandable.

---

## 20. Audit logging

Audit log should record sensitive actions:

- contractor created;
- contractor profile updated;
- bank details updated;
- document uploaded;
- document approved/rejected;
- timesheet submitted;
- timesheet approved/rejected;
- payment statement generated;
- invoice uploaded;
- invoice approved/rejected;
- payment marked paid.

Audit logs should not expose unnecessary personal data in `metadata`.

---

## 21. Development phases

### Phase 0: repository inspection

Goal:

- inspect repo;
- confirm current state;
- create or confirm Next.js base.

### Phase 1: base application shell

Build:

- layout;
- navigation;
- responsive shell;
- theme variables;
- simple dashboard placeholder.

Learning goals:

- what a layout is;
- what components are;
- how routing works.

### Phase 2: Supabase setup

Build:

- Supabase client files;
- environment variables;
- `.env.example`;
- local connection test.

Learning goals:

- what environment variables are;
- why secrets are not committed;
- difference between anon key and service role key.

### Phase 3: database migrations

Build:

- SQL migrations;
- tables;
- constraints;
- statuses;
- indexes.

Learning goals:

- tables;
- primary keys;
- foreign keys;
- constraints;
- indexes.

### Phase 4: authentication and roles

Build:

- login;
- logout;
- protected routes;
- profile role loading.

Learning goals:

- authentication vs authorisation;
- sessions;
- role-based access.

### Phase 5: RLS policies

Build:

- policies for profiles;
- policies for contractors;
- policies for timesheets;
- policies for invoices.

Learning goals:

- why database security matters;
- how contractor isolation is enforced.

### Phase 6: contractor profile

Build:

- contractor list for admin;
- contractor detail;
- contractor own profile;
- validation.

### Phase 7: projects and assignments

Build:

- project CRUD;
- contractor assignment;
- hourly rate;
- admin-only sales rate.

### Phase 8: documents

Build:

- private bucket setup;
- document upload;
- document status review;
- signed download URLs.

### Phase 9: timesheets

Build:

- monthly timesheet;
- daily entries;
- submit flow;
- approval/rejection flow;
- locking.

### Phase 10: payment statements

Build:

- calculation after approval;
- VAT treatment;
- contractor visible summary.

### Phase 11: invoices and payments

Build:

- invoice upload;
- invoice review;
- payment status;
- mismatch handling.

### Phase 12: exports

Build:

- CSV export;
- filters by month/project/status.

### Phase 13: staging and production deployment

Build:

- Vercel project;
- Supabase staging/prod;
- Cloudflare subdomain;
- production environment variables;
- security checklist.

---

## 22. Supabase deployment guide

These steps are for when the project is ready to deploy to staging or production.

### 22.1 Create Supabase project

1. Log in to Supabase.
2. Create a new project.
3. Choose an EU region.
4. Use a strong database password.
5. Save the project URL.
6. Save the anon key.
7. Do not paste the service role key into frontend code.

### 22.2 Apply migrations

Use one of these options:

- Supabase CLI migrations;
- SQL Editor in dashboard for early MVP;
- later, proper migration workflow.

For learning, SQL Editor is easier first. For professional workflow, migrations are better.

### 22.3 Enable RLS

For every business table:

```sql
alter table public.table_name enable row level security;
```

Then create policies.

Do not leave business tables exposed without RLS.

### 22.4 Create private storage buckets

Create:

```text
contractor-documents
contractor-invoices
```

Set both as private.

### 22.5 Create storage policies

Policies should allow:

- contractors to upload/read own files;
- admins to read/review all files;
- limited operations access if required.

### 22.6 Create test users

Create test users:

- admin test user;
- contractor test user;
- operations test user, optional.

Never use real contractor data in staging.

---

## 23. Vercel deployment guide

### 23.1 Connect GitHub

1. Log in to Vercel.
2. Click `Add New Project`.
3. Import the GitHub repository.
4. Confirm framework: Next.js.
5. Configure build settings if required.

### 23.2 Environment variables

Add variables in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://portal.anvelconsulting.com
RESEND_API_KEY
PORTAL_EMAIL_FROM=ANVEL Consulting <contact@anvelconsulting.com>
ADMIN_NOTIFICATION_EMAIL=contact@anvelconsulting.com
```

The service-role and Resend keys are server-only. Never expose them with a
`NEXT_PUBLIC_` prefix. Resend must have `anvelconsulting.com` verified with
valid SPF and DKIM records; DMARC is recommended. Redeploy Vercel after changing
environment variables. If delivery is delayed, inspect Resend delivery logs
before treating the portal workflow as failed.

Password changes also have a Supabase Auth security notification that is not
controlled by the portal email helper. In Supabase Dashboard, either disable
the **Password changed** security notification or configure Resend under
**Authentication > Email > SMTP Settings** and customize the Password changed
security template. Production must not leave this notification enabled with
Supabase's default sender.

### 23.2.1 Outgoing client invoice production setup

Apply `202606280002_outgoing_client_invoices.sql` and
`202606280006_manual_outgoing_invoices.sql` before deploying the outgoing
invoice module. Then:

1. Verify the `outgoing-invoices` Storage bucket is private and PDF-only.
2. Sign in as admin and complete `/settings/company`.
3. Complete Billing details on each billable Project.
4. Confirm each assignment has an admin-only sales rate.
5. Approve a fake-data timesheet and verify one draft invoice is created.
6. Create a manual project-based invoice from an active in-force project and
   verify the project billing snapshot is copied.
7. Review the PDF before using the manual Send invoice action.

The invoice copies sender, billing recipient, consultant, project, VAT and bank
details into snapshots. Later settings changes therefore do not rewrite issued
invoice history. Client billing remains admin-only and has no automated payment
integration. Manual outgoing invoices use `invoice_source = 'manual'`, keep
`project_id` required, and leave `timesheet_id` and `contractor_id` empty.

### 23.3 Preview deployments

Use preview deployments for branches.

This is useful for testing before production.

### 23.4 Production deployment

Production should be deployed only after:

- build passes;
- RLS tested;
- document access tested;
- environment variables configured;
- no real secrets in GitHub;
- no test data in production.

---

## 24. Cloudflare deployment guide

### 24.1 DNS goal

Final domain:

```text
portal.anvelconsulting.com
```

### 24.2 Add DNS record

In Cloudflare:

1. Open `anvelconsulting.com`.
2. Go to DNS.
3. Add CNAME:

```text
Type: CNAME
Name: portal
Target: value shown in Vercel
Proxy: enabled for normal web traffic, unless Vercel verification requires DNS-only first
```

### 24.3 SSL/TLS

1. Go to SSL/TLS in Cloudflare.
2. Use a secure SSL mode compatible with Vercel.
3. Check that HTTPS works.
4. Test the final URL.

### 24.4 Important warning

Always follow the exact Vercel custom domain instructions. If Vercel asks for a specific DNS record, use that value.

---

## 25. Production readiness checklist

Before real data is used:

- MFA enabled for admin accounts;
- GitHub private repo;
- `.env.local` not committed;
- no service role key exposed;
- Supabase project in EU region;
- RLS enabled on all business tables;
- storage buckets private;
- contractor cannot access another contractor's data;
- invoice files not publicly accessible;
- audit logs working;
- production domain uses HTTPS;
- staging uses fake data only;
- admin can export accountant data;
- backup/retention approach understood.

---

## 26. Interview explanation

If asked to explain this project in an interview, a good answer would be:

> I built a private contractor management portal for a consulting company using Next.js, TypeScript and Supabase. The application manages contractor onboarding, document uploads, monthly timesheets, invoice review and payment status. I designed the data model in PostgreSQL, used Supabase Auth for login, and applied Row Level Security so contractors can only access their own records. The app uses private Supabase Storage for invoices and contractual documents, and is designed for deployment on Vercel with Cloudflare DNS. I worked with a phased development process, documented setup and deployment, and focused on security, GDPR-aware data minimisation and maintainable code.

Concepts this project demonstrates:

- full-stack web development;
- React components;
- Next.js App Router;
- TypeScript;
- relational database design;
- authentication;
- authorisation;
- Row Level Security;
- private file storage;
- form validation;
- deployment;
- Git/GitHub workflow;
- production security considerations.
