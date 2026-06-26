# ANVEL Contractor Portal - Production Acceptance Sign-Off

This record is used before entering real contractor personal data into the
production portal. It confirms that the controlled smoke-test work has been
reviewed and that the production owner has approved the next operating step.

This is not legal advice, a security certification, or a replacement for an
internal data protection review.

## Production System

- Production portal: `https://portal.anvelconsulting.com`
- Production Supabase project ref: `rodduqyvlcltylzuheex`
- Development Supabase project ref: `fpurrflqsgiuolkuhcjv`
- Production handover checklist: `09_PRODUCTION_HANDOVER_CHECKLIST.md`
- Production closeout status: `15_PRODUCTION_CLOSEOUT_STATUS.md`

## Sign-Off Status

- Status: Not signed off
- Date:
- Approved by:
- Role or authority:
- Notes:

## Required Evidence

Confirm these before changing the status to signed off:

- Admin production smoke test passed.
- Controlled contractor production smoke test passed.
- Contractor isolation was checked in production.
- Admin-only routes were blocked for contractor users.
- Contractor profile editing and audit history were checked.
- Admin bank detail editing and audit history were checked.
- Document upload, signed download, and admin review were checked.
- Timesheet submission, approval, and payment statement generation were checked.
- Contractor invoice upload and admin review were checked.
- Manual payment status and accountant export were checked.
- `contractor-documents` and `contractor-invoices` buckets are private.
- Storage buckets allow PDF files only and have a 10 MB file size limit.
- Vercel Production environment variables point only to production Supabase.
- No Supabase service-role key is present in the app, browser, GitHub, or Vercel
  public environment variables.
- Smoke-test Auth access has been disabled or the smoke-test account retention
  decision has been recorded.

## Approval Decision

Choose one:

- [ ] Approved to onboard the first real contractor.
- [ ] Keep controlled smoke-test/demo data only for now.
- [ ] Blocked pending listed changes.

## Conditions Before First Real Contractor

- The contractor has already been selected and contractually accepted.
- No public registration is enabled.
- Only the minimum required contractor personal data will be entered.
- Passport or ID documents are not requested by default.
- Bank details are entered only through the audited admin bank detail flow.
- The first onboarding follows `07_PRODUCTION_ONBOARDING_RUNBOOK.md`.
- The production handover checklist remains current.

## Follow-Up Actions

Record any required actions before real contractor onboarding:

- Action:
- Owner:
- Due date:
- Status:

## Operating References

- `06_PRODUCTION_SMOKE_TEST_RUNBOOK.md`
- `07_PRODUCTION_ONBOARDING_RUNBOOK.md`
- `08_PRODUCTION_OPERATIONS_RUNBOOK.md`
- `09_PRODUCTION_HANDOVER_CHECKLIST.md`
- `10_PRODUCTION_BACKUP_RESTORE_DRILL.md`
- `11_PRODUCTION_MONITORING_AND_INCIDENT_CONTACTS.md`
- `12_PRODUCTION_DATA_RETENTION_POLICY.md`
- `13_ACCESSIBILITY_MOBILE_QA_CHECKLIST.md`
- `14_AUTHENTICATED_ROUTE_SMOKE_TEST_RUNBOOK.md`
- `15_PRODUCTION_CLOSEOUT_STATUS.md`
