# ANVEL Contractor Portal - Production Handover Checklist

This checklist records the production state after the controlled smoke test and lists the remaining operational work before real contractor data is used.

## Current Status

- Production portal: `https://portal.anvelconsulting.com`
- Production Supabase project ref: `rodduqyvlcltylzuheex`
- Development Supabase project ref: `fpurrflqsgiuolkuhcjv`
- Production closeout status is recorded in `15_PRODUCTION_CLOSEOUT_STATUS.md`.
- Production acceptance sign-off should be recorded in
  `16_PRODUCTION_ACCEPTANCE_SIGN_OFF.md` before real contractor personal data is
  entered.
- Public registration remains unavailable.
- Contractor, admin, and operations routes are role-aware.
- Contractor profile, document, timesheet, invoice, payment statement, payment status, export, and settings workflows have been implemented.
- Payments remain manual only. The portal does not trigger automatic bank payments.
- The system does not create self-billing invoices.
- Controlled production smoke-test data was used before real contractor data.
- A controlled production demo run was completed on 25 Jun 2026 using fake data through document upload, timesheet approval, payment statement generation, invoice upload/review, manual payment status, and accountant export.
- Controlled smoke-test/demo contractor Auth accounts have been disabled/banned after testing; records remain for audit history.
- A controlled production onboarding rehearsal was completed by 26 Jun 2026 using a fake contractor account through Auth/profile creation, contractor record creation, project assignment, contractor sign-in, profile isolation, document upload/review, timesheet submission/approval, payment statement generation, invoice upload/review, manual payment status, and accountant export.
- Controlled onboarding records remain fake production test data for audit and future release checks. They must not be treated as real contractor records.

## Before Real Contractor Data

Confirm these items before using real contractor personal data:

- Supabase production project is in an EU region.
- Vercel Production environment variables point to the production Supabase project only.
- `.env.local` remains local and is not committed.
- No service-role key is present in the app, browser, GitHub, or Vercel public environment variables.
- `contractor-documents` and `contractor-invoices` storage buckets are private.
- Both storage buckets allow PDF files only and have a 10 MB file size limit.
- Row Level Security is enabled on business tables.
- A contractor can see only their own contractor profile, documents, timesheets, invoices, and payments.
- Admin users can perform operational review actions.
- Audit logs record contractor profile updates and bank-detail updates.
- The production domain works through Cloudflare and Vercel.
- Production data retention, cleanup, and export disposal rules are documented in `12_PRODUCTION_DATA_RETENTION_POLICY.md`.

## Smoke-Test Data Decision

Choose one option:

- Keep the controlled production smoke-test contractor and records for future release checks.
- Deactivate or remove the smoke-test contractor after recording the final smoke-test result.

Recommended: keep the controlled smoke-test account until the first real contractor onboarding is complete.
Decision: controlled production smoke-test contractor was disabled/banned after successful smoke testing. Smoke-test records remain for audit history.
Onboarding rehearsal decision: keep the controlled onboarding contractor and records until the first real contractor onboarding is complete, then decide whether to disable the Auth user or retain it for future release checks.

## First Real Contractor Onboarding

The sequence below has been rehearsed with controlled fake production data. It is not complete for the first real contractor until an already selected and contractually accepted real contractor is onboarded.

Use this order for the first real contractor:

1. Confirm the contractor is already selected and contractually accepted.
2. Create the contractor Auth user in the production Supabase project.
3. Add the matching `profiles` row with role `contractor`.
4. Add the matching `contractors` row linked by `profile_id`.
5. Create or confirm the production project record.
6. Add the contractor project assignment with approved rate and dates.
7. Ask the contractor to sign in and check `My Profile`.
8. Confirm the contractor cannot access admin-only routes such as `/exports`.
9. Ask the contractor to upload required signed PDF documents.
10. Admin reviews uploaded documents.
11. Contractor submits the first monthly timesheet.
12. Admin approves or requests correction.
13. Generate the internal payment statement from the approved timesheet.
14. Contractor uploads the official invoice PDF.
15. Admin reviews the invoice.
16. Admin records manual payment status and reference.
17. Export accountant data if needed.

Controlled production demo result:

- Demo contractor: `contractor.prod.demo@anvelconsulting.com`
- Demo data only; no real contractor personal data was used.
- Project, assignment, document upload/review, timesheet approval, payment statement, invoice upload/review, payment status, and export flow were completed successfully.
- Demo contractor Auth access was disabled/banned after the successful test.
- Keep the demo records for audit/history unless the production owner decides to remove them.

## Operational Routine

Daily:

- Check sign-in works for admin.
- Review documents, submitted timesheets, invoice review, and payment queues.
- Watch for unexpected access or missing data.

Weekly:

- Confirm latest Vercel production deployment is ready.
- Confirm Supabase production project is healthy.
- Confirm storage buckets remain private.
- Review recent audit logs.
- Run the anonymous route smoke test after production deployments:
  `$env:SMOKE_BASE_URL="https://portal.anvelconsulting.com"; npm run test:routes`.
- Run the authenticated route smoke test with controlled session cookies after
  significant production changes:
  `npm run test:routes:auth` using
  `14_AUTHENTICATED_ROUTE_SMOKE_TEST_RUNBOOK.md`.
- Run the accessibility/mobile static QA check before UI-heavy releases:
  `npm run test:a11y-mobile`.

Monthly:

- Review active users and roles.
- Review contractor assignments and rates.
- Confirm export workflow still works.
- Review retention, cleanup, and local export disposal using `12_PRODUCTION_DATA_RETENTION_POLICY.md`.
- Confirm backup and restore readiness with the Supabase project owner using `10_PRODUCTION_BACKUP_RESTORE_DRILL.md`.
- Confirm incident contacts and first-response ownership using `11_PRODUCTION_MONITORING_AND_INCIDENT_CONTACTS.md`.

## Stop Conditions

Pause real-data usage and investigate if any of these happen:

- Settings shows the development Supabase project in production.
- A storage bucket becomes public.
- A contractor can see another contractor's data.
- Public registration becomes available.
- A profile or bank-detail change is missing from audit history.
- A real passport or ID document is requested by default.
- Any automatic payment or self-billing behavior appears.
- A service-role key is exposed outside Supabase server-side administration.

## Remaining Optional Work

These are not blockers for the controlled MVP, but they are sensible next improvements:

- Full browser-driven end-to-end smoke tests remain optional. Anonymous route
  smoke testing is available with `npm run test:routes`, and cookie-based
  authenticated route smoke testing is available with `npm run test:routes:auth`.
- Accessibility and mobile layout QA checklist is available in `13_ACCESSIBILITY_MOBILE_QA_CHECKLIST.md`; continue using it for future UI changes.
- Admin reporting refinements.
- More detailed accountant export formats if requested by finance.
