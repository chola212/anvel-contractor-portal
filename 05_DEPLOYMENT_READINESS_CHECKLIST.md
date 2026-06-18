# Deployment Readiness Checklist

Project: **ANVEL Contractor Portal**  
Production domain: `portal.anvelconsulting.com`  
Owner: **ERP UTILITIES CONSULTING SERVICES LTD**

Use this checklist before treating the portal as production-ready.

## 1. Environment Separation

Keep development/staging and production separate.

Development or staging:

- may use fake contractors, fake invoices and fake uploaded PDFs;
- may use fake test users such as `admin.test@anvel.local`;
- must not contain real contractor personal data.

Production:

- must use a separate Supabase project in an EU region;
- must not contain fake Phase 5/Phase 11 seed data;
- must only use real contractor data after the security review is complete.

## 2. GitHub

Check:

- repository is private;
- `main` contains the reviewed and merged code;
- no secrets are committed;
- `.env.local` is not committed;
- build passes locally before deployment.

Local verification:

```powershell
npm.cmd run lint
npm.cmd run build
```

## 3. Vercel

Vercel hosts the Next.js app.

Check the Vercel project:

- GitHub repository is connected;
- framework is detected as Next.js;
- production branch is `main`;
- latest production deployment is from the intended `main` commit;
- preview deployments are available for pull requests.

Required Vercel environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

If the Supabase dashboard only provides a legacy anon public key, use that value
for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Do not add the Supabase service role key to Vercel for the current app.

## 4. Supabase Production Project

Supabase provides Auth, PostgreSQL, Storage and RLS.

Production project checks:

- project is created in an EU region;
- database password is stored in a password manager;
- Auth is invite-only, with no public registration flow in the app;
- only real production users are created;
- admin accounts use MFA where available;
- fake development users are not present.

Apply migrations in order:

```text
supabase/migrations/202606160001_initial_schema_and_rls.sql
supabase/migrations/202606170001_contractor_document_storage.sql
supabase/migrations/202606180001_payment_statement_unique_timesheet.sql
supabase/migrations/202606180002_contractor_invoice_storage.sql
```

Run the verification queries from `supabase/README.md` after applying them.

## 5. Supabase Storage

Required private buckets:

```text
contractor-documents
contractor-invoices
```

Check each bucket:

- `public` is `false`;
- file size limit is `10485760`;
- allowed MIME types include only `application/pdf` for the MVP;
- contractors can upload only under their own contractor path;
- admins can manage files;
- operations cannot download sensitive files by default.

## 6. Row Level Security

RLS must be enabled on every business table.

Minimum production checks:

- admin can see all operational records;
- contractor can see only their own profile, projects, documents, timesheets,
  payment statements, invoices and payment status;
- contractor cannot access another contractor's rows by changing URLs;
- operations can see limited metadata only;
- operations cannot download sensitive document or invoice files;
- audit logs are not visible to contractors.

## 7. Cloudflare

Cloudflare manages DNS for the production domain.

Target domain:

```text
portal.anvelconsulting.com
```

Check:

- `anvelconsulting.com` zone exists in Cloudflare;
- `portal` CNAME points to the value required by Vercel;
- Vercel shows `portal.anvelconsulting.com` as valid;
- HTTPS works on the final domain;
- Cloudflare SSL/TLS mode is compatible with Vercel.

If Vercel asks for DNS-only during domain verification, temporarily disable the
Cloudflare proxy, verify the domain, then re-enable proxy only if Vercel remains
valid.

## 8. Production Smoke Test

After deployment, test with real production admin accounts only.

Check:

- `/login` loads;
- unauthenticated users are redirected away from protected pages;
- admin can sign in;
- admin can open dashboard, contractors, projects, documents, timesheets,
  invoices and exports;
- contractor account can sign in only after a matching active profile exists;
- contractor cannot access `/exports`;
- file downloads use signed links and are not public URLs.

## 9. Before Real Contractor Data

Do not add real contractor data until all items below are complete:

- production Supabase is separate from development;
- storage buckets are private;
- RLS checks pass;
- Vercel environment variables point to production Supabase;
- Cloudflare HTTPS is working;
- admin MFA is enabled where available;
- no fake test records are present in production;
- backup and retention approach is understood;
- at least one manual security review has been completed.

## 10. What Phase 13 Does Not Do

Phase 13 does not add:

- public registration;
- automatic bank payments;
- self-billing;
- electronic signatures;
- analytics/tracking scripts;
- passport or ID collection by default.

