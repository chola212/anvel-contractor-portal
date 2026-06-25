# ANVEL Contractor Portal - Production Backup and Restore Drill

This runbook explains how to confirm that the production Supabase project can be recovered without risking live contractor data.

Use this only for the production Supabase project:

```text
rodduqyvlcltylzuheex
```

Do not paste service-role keys into the app, browser, GitHub, Vercel public variables, local notes, or chat.

## Purpose

The goal is to prove that ANVEL can recover the portal database and private storage configuration if production data is damaged, deleted, or made inconsistent.

This drill does not replace Supabase documentation or the project owner's account controls. It gives ANVEL a safe operational checklist for this portal.

## Safety Rules

- Do not restore over the live production project during a drill.
- Do not connect the live production Vercel app to a temporary restore project unless a real incident requires it.
- Do not copy real contractor personal data into local development or the development Supabase project.
- Use an EU region for any temporary restore or staging Supabase project.
- Only a Supabase project owner or approved admin should perform backup or restore actions.
- Record who performed the check, when it happened, and what was verified.

## Frequency

- Backup availability check: monthly.
- Restore rehearsal: quarterly, before onboarding the first real contractor at scale, or before major production changes.
- Emergency restore: only during an approved production incident.

## Drill A: Backup Availability Check

This is the safest monthly check because it does not modify production.

1. Open Supabase.
2. Open the production project:

   ```text
   rodduqyvlcltylzuheex
   ```

3. Go to Database.
4. Open Backups.
5. Confirm a recent backup or point-in-time recovery option is available for the current Supabase plan.
6. Record the latest available backup timestamp.
7. Do not click restore during this monthly check.

Success criteria:

- A recent production backup exists.
- The project owner knows where the restore controls are.
- No production app setting was changed.

## Drill B: Restore Rehearsal

Use this when ANVEL wants proof that restore works end to end.

1. Choose a quiet testing window.
2. Create or select a temporary Supabase restore/staging project in an EU region.
3. Restore the chosen production backup into the temporary project using Supabase's restore process.
4. Do not change Vercel Production environment variables.
5. If app testing is needed, use local or preview environment variables pointing to the temporary restore project.
6. Run the verification queries below against the temporary restore project.
7. Record the result.
8. Delete or disable the temporary restore project after the drill if it contains copied production personal data.

Success criteria:

- The restored database opens.
- Critical tables exist.
- Row Level Security is still enabled.
- Private storage buckets are present and private.
- PDF-only storage rules are still present.
- The app is never accidentally pointed away from the real production project.

## Verification Queries

Run these in the Supabase SQL Editor for the project being checked.

### Business Tables

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
```

Expected important tables include:

- `profiles`
- `contractors`
- `projects`
- `contractor_projects`
- `document_requirements`
- `contractor_documents`
- `timesheets`
- `timesheet_entries`
- `payment_statements`
- `invoices`
- `payments`
- `audit_logs`

### Row Level Security

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Expected result:

- Business tables should show `rowsecurity = true`.

### Storage Buckets

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('contractor-documents', 'contractor-invoices')
order by id;
```

Expected result:

- `public` is `false`.
- `file_size_limit` is `10485760`.
- `allowed_mime_types` includes only `application/pdf`.

### Profile Update Function

```sql
select proname
from pg_proc
where proname = 'update_own_contractor_profile';
```

Expected result:

- `update_own_contractor_profile` exists.

## Emergency Restore Outline

Use this only when production is genuinely broken.

1. Pause production data entry if possible.
2. Record the incident:
   - time;
   - affected route or workflow;
   - affected contractor/project/invoice/timesheet records;
   - screenshots where safe.
3. Confirm whether rollback should be app-only, database-only, or both.
4. For app-only failures, use the Vercel rollback process from `08_PRODUCTION_OPERATIONS_RUNBOOK.md`.
5. For database failures, choose a restore point with the Supabase project owner.
6. Restore according to Supabase's production restore process.
7. If restoring to a replacement production Supabase project, update Vercel Production environment variables only after approval.
8. Redeploy the production app if environment variables changed.
9. Run the production smoke checks from `06_PRODUCTION_SMOKE_TEST_RUNBOOK.md`.
10. Record the final result and any follow-up fixes.

## Drill Log Template

Copy this table into an operations note after each drill.

| Date | Performed by | Project checked | Backup timestamp | Restore destination | Result | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | Name | rodduqyvlcltylzuheex | YYYY-MM-DD HH:MM | Not restored / temporary EU project | Pass / Fail | Notes |

## Stop Conditions

Stop and investigate before continuing if any of these happen:

- no recent production backup is available;
- a restore would overwrite live production during a drill;
- a restored project is created outside an EU region;
- a service-role key is exposed outside Supabase administration;
- `contractor-documents` or `contractor-invoices` is public;
- RLS is disabled on business tables;
- Vercel Production environment variables point to the wrong Supabase project.

## Next Safe Step

After one successful backup availability check, the next operational hardening step is to document monitoring and incident contacts:

- who owns Supabase;
- who owns Vercel;
- who owns Cloudflare DNS;
- who can approve emergency SQL or restore actions.
