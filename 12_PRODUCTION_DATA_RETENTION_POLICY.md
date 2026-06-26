# ANVEL Contractor Portal - Production Data Retention Policy

This policy explains how ANVEL should keep, review, archive, and remove production portal data.

It is an operational policy for the ANVEL Contractor Portal. It is not legal or accounting advice. Before deleting real contractor, invoice, tax, bank, or audit data, ANVEL should confirm the decision with the production owner and the finance/accounting owner.

## Scope

This policy applies to:

- the production portal at `https://portal.anvelconsulting.com`;
- the production Supabase project;
- production Supabase Storage buckets;
- production Vercel environment configuration;
- accountant exports created from production data.

Development and local environments must continue to use fake data only.

## Data Minimization Rules

Keep only the data needed to operate the accepted contractor relationship.

Do not use the portal for:

- public registration;
- candidate sourcing;
- CV storage;
- SAP code or SAP client data;
- detailed task tracking;
- passport or ID collection by default;
- automatic bank payments;
- self-billing or legal invoice issuing.

Do not put real personal data, full bank details, service-role keys, or production secrets into GitHub issues, commits, chat messages, screenshots, or local notes.

## Data Categories

The portal may store these production data categories:

- Supabase Auth users and app profile rows;
- contractor legal, fiscal, contact, and bank details;
- project records and contractor assignments;
- signed contractor document PDFs and metadata;
- monthly timesheets and entries;
- internal payment statements;
- official contractor invoice PDFs and metadata;
- manual payment status and reference records;
- accountant export files;
- audit logs for sensitive actions.

## Retention Principles

- Prefer disabling access or marking records inactive over hard deletion.
- Disable Supabase Auth access immediately when a contractor should no longer use the portal.
- Keep finance, invoice, timesheet, payment, and audit records for the period required by ANVEL and its accountant.
- Do not routinely delete audit logs.
- Keep document and invoice storage buckets private.
- Allow PDF uploads only, with the existing 10 MB file size limit.
- Store accountant exports only in approved private accounting locations.
- Delete local export downloads after they have been transferred to the approved accounting location.
- Keep full bank details admin-only. Show masked values where possible.

## Retention Decisions

| Record area | Default decision | Owner | Cleanup action |
| --- | --- | --- | --- |
| Auth user access | Disable when access is no longer needed | Production owner | Disable or remove Supabase Auth user |
| Profiles and contractors | Keep historical records unless deletion is approved | Production owner | Mark inactive where appropriate |
| Projects and assignments | Keep for operational and payment history | Production owner | End dates and inactive status |
| Signed documents | Keep while required for contractor administration | Production owner and finance/accounting owner | Delete only after approved retention decision |
| Timesheets | Keep for payment and audit history | Finance/accounting owner | Do not delete casually |
| Payment statements | Keep for payment and audit history | Finance/accounting owner | Do not delete casually |
| Official invoices | Keep for finance/accounting history | Finance/accounting owner | Do not delete casually |
| Manual payment records | Keep for finance/accounting history | Finance/accounting owner | Do not delete casually |
| Accountant exports | Store privately only as long as needed | Finance/accounting owner | Delete local copies after transfer |
| Audit logs | Keep for accountability | Production owner | Do not delete routinely |
| Backups | Follow Supabase project backup availability | Supabase owner | Review using `10_PRODUCTION_BACKUP_RESTORE_DRILL.md` |

## Routine Review Schedule

Monthly:

1. Review active Supabase Auth users.
2. Disable users who should no longer have portal access.
3. Review inactive contractors and ended assignments.
4. Confirm local accountant export downloads have been removed after transfer.
5. Confirm no real data has been copied into development or local test records.
6. Record any manual cleanup decisions.

Quarterly:

1. Review inactive contractor records.
2. Review document and invoice storage for unnecessary controlled test files.
3. Confirm only approved admins have access to production Supabase and Vercel.
4. Confirm Cloudflare and domain ownership contacts are still correct.

Annually:

1. Review this policy with the production owner.
2. Confirm finance/accounting retention expectations.
3. Update the policy if legal, accounting, or operational requirements change.

## Deletion Or Correction Workflow

Use this workflow before deleting or correcting production data:

1. Identify the exact record IDs, contractor, project, document, invoice, timesheet, or payment affected.
2. Confirm whether the safer action is to disable, mark inactive, end-date, or correct the record instead of deleting it.
3. Get approval from the production owner.
4. Get finance/accounting approval if the record affects invoices, payment statements, payments, timesheets, tax, bank details, or exports.
5. Prepare reviewed SQL or an approved admin action.
6. Confirm the SQL Editor is open in the production Supabase project, not development.
7. Run the change.
8. Verify the result in the portal and Supabase.
9. Record the decision and outcome in ANVEL's private operational notes.

Never run deletion SQL casually in production.

## Contractor Data Requests

If a contractor asks about their personal data:

1. Record the request in ANVEL's private operational notes.
2. Do not make immediate ad hoc deletions.
3. Confirm the contractor identity through an approved ANVEL process.
4. Ask the production owner and finance/accounting owner to review the request.
5. Use the deletion or correction workflow above if a change is approved.

## First Real Contractor Data Rule

Before adding a real contractor:

1. Confirm the contractor has already been selected and contractually accepted.
2. Add only the data needed for portal operation.
3. Do not add passport or ID documents by default.
4. Confirm the contractor can see only their own records.
5. Confirm any uploaded PDFs are required for the contractor relationship.
6. Confirm audit logs record profile and bank-detail changes.

## Emergency Access Or Exposure

If real data may have been exposed:

1. Stop adding or changing records until the issue is understood.
2. Use `11_PRODUCTION_MONITORING_AND_INCIDENT_CONTACTS.md`.
3. Disable affected access if needed.
4. Rotate exposed keys if any secret was involved.
5. Record what happened, what was affected, and how it was fixed.
