# Production Onboarding Runbook

Project: **ANVEL Contractor Portal**  
Production domain: `portal.anvelconsulting.com`  
Owner: **ERP UTILITIES CONSULTING SERVICES LTD**

Use this runbook only after `06_PRODUCTION_SMOKE_TEST_RUNBOOK.md` has passed.
It explains how to move from controlled smoke-test records to the first real
contractor onboarding.

Do not use this runbook to add real contractor personal data until the business
owner has approved production onboarding.

## 1. Go/No-Go Gate

Before adding a real contractor, confirm:

- production smoke test is recorded as passed;
- production Supabase is separate from development and is in an EU region;
- Vercel production environment variables point to production Supabase;
- `portal.anvelconsulting.com` opens over HTTPS;
- public registration is not available;
- `contractor-documents` and `contractor-invoices` buckets are private;
- all business tables have RLS enabled;
- admin MFA is enabled where available;
- no service-role key is stored in the app, Vercel, GitHub, or local `.env`;
- the contractor has already been selected and contractually accepted;
- the contractor has been told what data will be stored in the portal.

Stop if any item is not confirmed.

## 2. Data Minimisation Rules

Collect only data needed for the current operational workflow.

Allowed for first onboarding:

- name and contact email;
- contractor legal/fiscal profile fields;
- required signed PDF documents;
- project assignment and hourly rate;
- monthly hours actually worked;
- generated self-billing invoice PDF, with optional manual invoice PDF fallback;
- manual payment status and accountant export data.

Do not add by default:

- passport or ID documents;
- SAP client data;
- SAP credentials;
- payment card data;
- automatic bank payment credentials;
- detailed task descriptions;
- analytics or tracking identifiers.

## 3. Create The Contractor Auth User

In production Supabase:

1. Open the production project.
2. Go to Authentication.
3. Open Users.
4. Click Add user or Invite user.
5. Use the contractor's real approved email address.
6. Use a temporary password only if the agreed onboarding process allows it.
7. Copy the new Auth user UID.

Record:

```text
Contractor email:
Auth user UID:
Created by:
Created at:
```

## 4. Add The Matching Profile Row

In production Supabase SQL Editor, run this with real values.

Replace every placeholder before running.

```sql
insert into public.profiles (id, email, full_name, role, is_active)
values (
  'PASTE_AUTH_USER_UID_HERE',
  'contractor@example.com',
  'Contractor Full Name',
  'contractor',
  true
)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = excluded.is_active;
```

Verification:

```sql
select id, email, full_name, role, is_active
from public.profiles
where id = 'PASTE_AUTH_USER_UID_HERE';
```

Expected result:

- one row;
- role is `contractor`;
- `is_active` is `true`.

## 5. Add The Contractor Profile

Use the smallest complete data set needed for onboarding.

Replace every placeholder before running.

```sql
insert into public.contractors (
  profile_id,
  email,
  legal_name,
  trading_name,
  phone,
  country,
  supplier_type,
  company_registration_number,
  vat_number,
  tax_number,
  fiscal_address,
  vat_treatment,
  status
)
values (
  'PASTE_AUTH_USER_UID_HERE',
  'contractor@example.com',
  'Contractor Legal Name',
  null,
  null,
  'CY',
  'limited_company',
  null,
  null,
  null,
  'Approved fiscal address',
  'cyprus_vat_19',
  'active'
)
on conflict (profile_id) do update
set
  email = excluded.email,
  legal_name = excluded.legal_name,
  trading_name = excluded.trading_name,
  phone = excluded.phone,
  country = excluded.country,
  supplier_type = excluded.supplier_type,
  company_registration_number = excluded.company_registration_number,
  vat_number = excluded.vat_number,
  tax_number = excluded.tax_number,
  fiscal_address = excluded.fiscal_address,
  vat_treatment = excluded.vat_treatment,
  status = excluded.status;
```

Allowed `supplier_type` values:

```text
limited_company
self_employed
sole_trader
other
```

Allowed `vat_treatment` values:

```text
cyprus_vat_19
eu_reverse_charge
eu_no_vat_accountant_review
non_eu_accountant_review
```

Verification:

```sql
select
  p.id as profile_id,
  p.email,
  p.role,
  c.id as contractor_id,
  c.legal_name,
  c.country,
  c.vat_treatment,
  c.status
from public.profiles p
join public.contractors c on c.profile_id = p.id
where p.id = 'PASTE_AUTH_USER_UID_HERE';
```

Expected result:

- one profile row;
- one linked contractor row;
- contractor status is `active`.

## 6. Add Required Document Rules

Only add document requirements that are actually required for the contractor's
supplier type.

Example:

```sql
insert into public.document_requirements (
  supplier_type,
  name,
  is_required,
  requires_expiry_date
)
select
  'limited_company',
  'Contractor Agreement',
  true,
  false
where not exists (
  select 1
  from public.document_requirements
  where supplier_type = 'limited_company'
    and name = 'Contractor Agreement'
);
```

Do not add passport or ID requirements unless a later approved process requires
them.

## 7. Create Or Confirm The Project

Create the project in the portal as admin:

1. Sign in to `https://portal.anvelconsulting.com`.
2. Open Projects.
3. Create the project.
4. Use the external client label only if it is approved for portal storage.
5. Set country, dates, currency and status.

Confirm the project appears in the Projects list.

## 8. Assign The Contractor

As admin:

1. Open the project detail page.
2. Create an assignment for the contractor.
3. Enter the approved hourly rate in EUR.
4. Enter the assignment start date.
5. Enter the end date if known.
6. Leave sales rate blank unless it is approved for the portal.
7. Save.

Confirm:

- the assignment appears on the project;
- the assignment appears on the contractor detail page;
- the contractor sees the assignment on My Profile.

## 9. Contractor Login Check

Ask the contractor to sign in only after the profile and contractor rows exist.

Contractor checks:

1. Sign in.
2. Open Dashboard.
3. Open My Profile.
4. Confirm only their own profile is visible.
5. Confirm bank details are read-only.
6. Try opening `/exports`.

Expected result:

- the contractor cannot access exports;
- the contractor cannot see other contractors;
- the contractor can update only allowed non-bank profile fields.

## 10. Document Workflow

Contractor:

1. Open Documents.
2. Select the required document.
3. Upload the approved PDF.
4. Confirm the document status appears.

Admin:

1. Open Documents.
2. Download the PDF using the signed link.
3. Review the document.
4. Mark it as uploaded, approved, rejected, or expired according to the actual
   review result.

Do not share direct Supabase storage URLs.

## 11. Timesheet Workflow

Contractor:

1. Open Timesheets.
2. Start a monthly timesheet.
3. Add only days actually worked.
4. Submit the timesheet.

Admin:

1. Open Timesheets.
2. Review the submitted timesheet.
3. Approve it or reject it with a correction reason.

Do not request detailed task descriptions in this portal.

## 12. Payment Statement And Invoice Workflow

Admin:

1. Generate the payment statement from an approved timesheet.
2. Confirm hours, hourly rate, VAT treatment, net amount, VAT amount and gross
   amount.

Contractor:

1. Open Invoices.
2. Upload the official invoice PDF against the payment statement.
3. Use the contractor's own invoice number and invoice date.

Admin:

1. Open Invoices.
2. Download the invoice PDF.
3. Review the invoice.
4. Record the invoice review status and comment.

The portal generates self-billing invoices from approved timesheets. Contractor-uploaded invoices remain an optional manual fallback if ANVEL needs one for a specific case.

## 13. Manual Payment Status

After external payment handling is complete, admin can update manual payment
status.

Record only:

- payment status;
- payment date, if available;
- payment reference;
- paid amount;
- internal note, if needed.

This does not trigger any bank payment.

## 14. Accountant Export

Admin or operations:

1. Open Exports.
2. Filter by the relevant invoice month and status.
3. Download the CSV.
4. Confirm it contains supplier, invoice, VAT, project and manual payment
   status fields.

Confirm the CSV does not include:

- full bank details;
- private file paths;
- signed document links.

## 15. Audit Review

Admin should review audit history for:

- contractor profile creation;
- contractor self-profile updates;
- admin profile updates;
- admin bank detail updates;
- document review;
- invoice review;
- payment status changes.

Bank detail audit output must show masked IBAN values only.

## 16. If Something Fails

If onboarding fails:

1. Stop adding more real contractor data.
2. Record the exact user, URL, action and time.
3. Check Vercel logs.
4. Check Supabase Auth, profiles, contractors, RLS and Storage policies.
5. Use a small fix branch and pull request.
6. Retest the failed step after merge and deployment.

Do not bypass RLS or make storage buckets public to fix access problems.

## 17. Deactivation Procedure

If a contractor should no longer access the portal:

1. Set their `profiles.is_active` to `false`.
2. Set their `contractors.status` to `inactive`.
3. End or deactivate active project assignments.
4. Confirm they can no longer access protected contractor workflows.
5. Keep historical invoice, payment and audit records for business retention.

Do not delete contractor records unless a retention/legal review explicitly
approves deletion.
