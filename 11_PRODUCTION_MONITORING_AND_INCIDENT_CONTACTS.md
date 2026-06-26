# ANVEL Contractor Portal - Production Monitoring and Incident Contacts

This runbook defines the first people, systems, and checks to use when the live ANVEL Contractor Portal has a production issue.

Use this only for the production portal:

```text
https://portal.anvelconsulting.com
```

Production Supabase project:

```text
rodduqyvlcltylzuheex
```

Do not paste passwords, service-role keys, contractor bank details, full IBANs, or real contractor documents into chat, GitHub issues, screenshots, or public notes.

## Contact Roles

Fill these names and phone/email contacts in ANVEL's private operations records, not in the public repository.

| Role | Owns | Contact location |
| --- | --- | --- |
| Production owner | Final decision to pause, restore, or continue production use | ANVEL private records |
| Supabase owner | Auth users, database, RLS, storage, backup and restore actions | ANVEL private records |
| Vercel owner | Production deployment, environment variables, rollback | ANVEL private records |
| Cloudflare/DNS owner | `portal.anvelconsulting.com` DNS and proxy settings | ANVEL private records |
| Finance/accounting contact | Payment status, export checks, invoice review questions | ANVEL private records |

## Normal Monitoring

Daily while the portal is being used:

1. Open `https://portal.anvelconsulting.com`.
2. Confirm admin sign-in works.
3. Open Dashboard and check for unexpected queue counts.
4. Open Documents, Timesheets, Invoices, Payments, and Exports.
5. Confirm no unexpected error pages appear.
6. Confirm no public registration or self-signup route is visible.

Weekly:

1. Confirm Vercel Production deployment is `Ready`.
2. Confirm `portal.anvelconsulting.com` still opens the latest production deployment.
3. Confirm Supabase production project is healthy.
4. Confirm storage buckets remain private:
   - `contractor-documents`
   - `contractor-invoices`
5. Review recent audit logs for profile and bank-detail changes.

Monthly:

1. Review active Supabase Auth users.
2. Disable accounts that should no longer access the portal.
3. Run the backup availability check in `10_PRODUCTION_BACKUP_RESTORE_DRILL.md`.
4. Record any incident, access, or data correction notes in ANVEL's private operations records.

## Incident Severity

Use the lowest severity that matches the issue.

### Severity 1: Stop Production Use

Examples:

- contractor can see another contractor's data;
- production points to the development Supabase project;
- a storage bucket is public;
- a service-role key or secret is exposed;
- a payment or invoice workflow records incorrect real financial data;
- real contractor personal data is accidentally exposed.

Immediate action:

1. Stop entering production data.
2. Disable affected user accounts if access control is involved.
3. Contact the production owner and Supabase owner.
4. Record the time, route, user, and affected records.
5. Do not delete records until the owner approves a correction plan.

### Severity 2: Production Workflow Blocked

Examples:

- admin cannot sign in;
- contractor cannot upload a required PDF;
- timesheet approval fails;
- invoice review or payment status update fails;
- accountant export fails.

Immediate action:

1. Capture the exact route and error message.
2. Check whether the issue affects one user or all users.
3. Check Vercel deployment status.
4. Check Supabase project health.
5. Use Vercel rollback only if the issue began after a recent deployment and database changes are not the cause.

### Severity 3: Non-Blocking Issue

Examples:

- layout issue on one screen;
- unclear label;
- slow page load that eventually completes;
- typo in operational copy;
- export formatting improvement request.

Immediate action:

1. Record the issue.
2. Continue normal production use if data and access control are safe.
3. Fix through a normal pull request.

## First Checks During An Incident

1. Confirm the portal URL is correct:

   ```text
   https://portal.anvelconsulting.com
   ```

2. Confirm Vercel production deployment is `Ready`.
3. Confirm Vercel Production environment variables point to production Supabase:

   ```text
   rodduqyvlcltylzuheex
   ```

4. Confirm Supabase production project is open, not development.
5. Confirm the affected user has the expected role in `profiles`.
6. Confirm related contractor/project/timesheet/invoice/payment rows exist.
7. Confirm RLS is enabled on business tables.
8. Confirm private storage buckets are not public.

## What To Record

Record only operational details needed to diagnose the issue.

Safe to record:

- date and time;
- route;
- affected workflow;
- user role;
- record IDs;
- non-sensitive screenshots;
- Vercel deployment hash;
- Supabase project ref.

Do not record in public places:

- passwords;
- service-role keys;
- contractor bank details;
- full IBANs;
- real signed contractor documents;
- unnecessary contractor personal details.

## Escalation Order

1. Production owner decides whether to pause production use.
2. Supabase owner checks Auth, database, RLS, storage, and backups.
3. Vercel owner checks deployment, environment variables, and rollback options.
4. Cloudflare/DNS owner checks domain routing only if the portal cannot be reached.
5. Finance/accounting contact verifies payment, invoice, or export meaning when needed.

## Recovery Paths

Use the narrowest recovery path that fixes the issue.

- App deployment issue: use Vercel rollback from `08_PRODUCTION_OPERATIONS_RUNBOOK.md`.
- Database data issue: prepare reviewed SQL and run it only in production Supabase after approval.
- Backup or restore issue: use `10_PRODUCTION_BACKUP_RESTORE_DRILL.md`.
- User access issue: disable or correct the Supabase Auth user and matching `profiles` row.
- Storage issue: confirm bucket privacy, policies, file size, and PDF-only MIME rules.

## Incident Closure

An incident is closed only when:

- the affected route or workflow has been retested;
- affected records have been checked;
- access control is confirmed safe;
- the fix is documented in ANVEL private operations records;
- any required follow-up PR or SQL correction has been created.

