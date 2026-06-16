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

## Database Migrations

Migration files live in:

```text
supabase/migrations/
```

Read `supabase/README.md` before applying any SQL to Supabase.
