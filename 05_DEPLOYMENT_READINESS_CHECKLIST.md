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
supabase/migrations/202606230001_contractor_self_profile_update.sql
```

Run the verification queries from `supabase/README.md` after applying them.

Phase 27 admin bank detail editing does not require a migration because the
bank columns already exist in the initial schema.

Check:

- `update_own_contractor_profile` exists after applying the Phase 26 migration;
- contractor self-profile updates create audit log entries;
- admin bank detail updates create masked-IBAN audit log entries.

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
- contractor can update only their own allowed non-bank profile fields through
  the self-profile RPC;
- contractor cannot update status, email, assignments, rates, or bank account
  fields;
- operations can see limited metadata only;
- operations cannot download sensitive document or invoice files;
- audit logs are not visible to contractors;
- bank detail audit entries store masked IBAN values only.

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

Use `06_PRODUCTION_SMOKE_TEST_RUNBOOK.md` for the full step-by-step smoke test
and record each result as `pass`, `fail`, or `blocked`.

Check:

- `/login` loads;
- unauthenticated users are redirected away from protected pages;
- admin can sign in;
- admin can open dashboard, contractors, projects, documents, timesheets,
  invoices and exports;
- contractor account can sign in only after a matching active profile exists;
- contractor can edit allowed legal and fiscal profile fields;
- contractor cannot edit bank details;
- admin can edit a contractor's bank account holder, IBAN, and SWIFT/BIC from
  the dedicated bank details form;
- profile and bank detail changes appear in admin-only audit history;
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
- contractor self-profile updates have been tested through the production
  Supabase project with a real invite-only contractor account;
- admin-only bank detail editing has been tested with masked audit output;
- backup and retention approach is understood;
- at least one manual security review has been completed.

After these checks pass, use `07_PRODUCTION_ONBOARDING_RUNBOOK.md` for the
first real contractor onboarding workflow.

## 10. Current MVP Feature Readiness

This checklist covers the reviewed MVP work through Phase 32:

- invite-only authentication;
- role-aware protected portal routes;
- contractor profiles, projects, documents, timesheets, invoices, payments and
  exports;
- private document and invoice storage;
- contractor self-profile editing for non-bank legal and fiscal fields;
- admin-only bank detail editing with masked audit logs;
- production smoke-test runbook for final access and deployment checks;
- controlled production onboarding runbook for the first real contractor after
  business and security approval.

## 11. What The MVP Does Not Do

The current MVP does not add:

- public registration;
- automatic bank payments;
- automatic bank payments;
- electronic signatures;
- analytics/tracking scripts;
- passport or ID collection by default.

