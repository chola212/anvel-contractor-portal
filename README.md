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
