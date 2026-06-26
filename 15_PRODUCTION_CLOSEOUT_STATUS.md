# ANVEL Contractor Portal - Production Closeout Status

This document records the current MVP state after the controlled production
smoke tests and handover preparation. It is a status checkpoint, not a new
feature phase.

## Current Status

The portal is ready for controlled production use with contractors who have
already been selected and contractually accepted.

Production URL:

```text
https://portal.anvelconsulting.com
```

Production Supabase project ref:

```text
rodduqyvlcltylzuheex
```

Development Supabase project ref:

```text
fpurrflqsgiuolkuhcjv
```

## Completed Scope

The current MVP includes:

- invite-only Supabase authentication;
- role-aware routing for `admin`, `operations`, and `contractor`;
- protected portal routes with no public registration;
- Supabase PostgreSQL tables with RLS enabled;
- private Supabase Storage buckets for contractor documents and invoices;
- contractor profile creation, viewing, and audited profile updates;
- admin-only audited contractor bank detail updates;
- project records and contractor assignments;
- contractor document requirements, upload, signed download, and admin review;
- monthly timesheets with worked-day entries, submit, approve, reject, and reopen flows;
- internal payment statements generated from approved timesheets;
- contractor invoice PDF upload, signed download, and admin invoice review;
- manual payment status tracking and references;
- accountant CSV export without private file paths or bank details;
- settings, dashboard, deployment readiness, and operational runbooks;
- anonymous and authenticated route smoke test scripts.

## Explicitly Out Of Scope

The portal still does not provide:

- candidate sourcing or recruitment CRM features;
- public registration;
- client portal access;
- SAP code or SAP client data storage;
- automatic legal invoice issuing on behalf of contractors;
- self-billing;
- automatic bank payments;
- payment card collection;
- electronic signature integration;
- analytics or tracking scripts.

## Production Safety Rules

Before adding real contractor personal data, confirm:

- the production Supabase project is in an EU region;
- Vercel Production environment variables point only to the production Supabase project;
- `.env.local` remains local and is not committed;
- no Supabase service-role key is present in the app, browser, GitHub, or Vercel public variables;
- `contractor-documents` and `contractor-invoices` buckets are private;
- storage buckets allow PDF files only with a 10 MB file size limit;
- contractors can see only their own data;
- profile and bank-detail updates appear in audit history.

## Operating Rhythm

Use these files for ongoing operations:

- `06_PRODUCTION_SMOKE_TEST_RUNBOOK.md` for full manual production smoke tests;
- `07_PRODUCTION_ONBOARDING_RUNBOOK.md` for first real contractor onboarding;
- `08_PRODUCTION_OPERATIONS_RUNBOOK.md` for routine admin operations;
- `09_PRODUCTION_HANDOVER_CHECKLIST.md` for production ownership handover;
- `10_PRODUCTION_BACKUP_RESTORE_DRILL.md` for backup/restore readiness;
- `11_PRODUCTION_MONITORING_AND_INCIDENT_CONTACTS.md` for incident ownership;
- `12_PRODUCTION_DATA_RETENTION_POLICY.md` for cleanup and export disposal;
- `13_ACCESSIBILITY_MOBILE_QA_CHECKLIST.md` for UI quality checks;
- `14_AUTHENTICATED_ROUTE_SMOKE_TEST_RUNBOOK.md` for cookie-based route checks.

## Remaining Optional Work

These are not blockers for the controlled MVP:

- full browser-driven end-to-end automation;
- finance-specific export format refinements;
- richer admin reporting if requested by operations;
- scheduled production drills for backup, incident response, and access review.

## Next Decision

Choose one:

- start first real contractor onboarding using `07_PRODUCTION_ONBOARDING_RUNBOOK.md`
  and `09_PRODUCTION_HANDOVER_CHECKLIST.md`;
- keep operating only with controlled smoke-test records until production ownership
  and internal process sign-off are complete.
