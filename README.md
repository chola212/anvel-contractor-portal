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
- no project editing, assignment editing, or rate editing yet.

Phase 8 starts the documents module:

- read-only document metadata view for staff and contractors;
- contractors can only see their own document metadata through existing RLS;
- operations can see metadata but not file names or downloads in the UI;
- private `contractor-documents` storage bucket migration is prepared;
- contractor PDF upload writes to private storage and creates metadata;
- admin and contractors can use short-lived signed PDF download links;
- review actions are intentionally left for the next approved step.
