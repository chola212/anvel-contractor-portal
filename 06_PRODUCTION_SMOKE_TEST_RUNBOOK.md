# Production Smoke Test Runbook

Project: **ANVEL Contractor Portal**  
Production domain: `portal.anvelconsulting.com`  
Owner: **ERP UTILITIES CONSULTING SERVICES LTD**

Use this runbook after a production deployment and before adding real contractor
records. Record the result of each step as `pass`, `fail`, or `blocked`.

Do not use fake development users in production. Do not paste service-role keys
into the app, terminal, GitHub, or Vercel.

## 1. Before You Start

Confirm:

- the latest GitHub `main` branch is deployed to Vercel production;
- Vercel production environment variables point to the production Supabase
  project, not the development project;
- production Supabase is in an EU region;
- all migrations listed in `05_DEPLOYMENT_READINESS_CHECKLIST.md` have been
  applied to production;
- `portal.anvelconsulting.com` opens over HTTPS;
- the production Supabase project has one real admin user with a matching active
  `profiles` row.

Evidence to keep:

```text
GitHub commit:
Vercel deployment URL:
Production Supabase project reference:
Smoke test date:
Tester:
```

## 2. Public Access Checks

### Login Page

1. Open `https://portal.anvelconsulting.com/login`.
2. Confirm the login page loads.
3. Confirm there is no public registration link.
4. Try a wrong email/password combination.

Expected result:

- the login page loads;
- public registration is not available;
- the wrong login shows a controlled error.

### Protected Routes

1. Open `https://portal.anvelconsulting.com/contractors` in a signed-out
   browser.
2. Open `https://portal.anvelconsulting.com/exports` in a signed-out browser.

Expected result:

- protected routes do not show portal data to signed-out users;
- the app redirects to login or blocks access.

## 3. Admin Smoke Test

Use a real production admin account.

1. Sign in as admin.
2. Open Dashboard.
3. Open Contractors.
4. Open Projects.
5. Open Documents.
6. Open Timesheets.
7. Open Invoices.
8. Open Payments.
9. Open Exports.
10. Open Settings.

Expected result:

- each page loads without an application error;
- dashboard counts load from production Supabase;
- admin navigation includes operational admin pages;
- Settings shows the production Supabase project reference.

## 4. Contractor Invite And Profile Link

Use a real contractor email only when the production security review allows it.
If this is still pre-production, use a controlled internal test email that is not
a fake Phase 5 development user.

1. Create or invite the contractor user in Supabase Auth.
2. Confirm the user has a matching `profiles` row with role `contractor`.
3. Confirm the user has a matching `contractors` row linked by `profile_id`.
4. Sign in as the contractor.
5. Open My Profile.

Expected result:

- the contractor can sign in only after a matching profile exists;
- the contractor sees only their own profile;
- bank details are read-only for the contractor.

## 5. Contractor Data Isolation

Run this only if two controlled contractor accounts exist.

1. Sign in as contractor A.
2. Open contractor A profile, documents, timesheets, invoices and payments.
3. Try to open a URL copied from contractor B, such as a contractor detail,
   timesheet detail, invoice download, or document download URL.

Expected result:

- contractor A cannot see contractor B data;
- file downloads do not expose another contractor's private PDFs;
- blocked access should fail cleanly without leaking sensitive information.

## 6. Contractor Self-Profile Update

1. Sign in as a contractor.
2. Open My Profile.
3. Update allowed non-bank fields such as trading name or phone.
4. Save the profile.
5. Sign out.
6. Sign in as admin.
7. Open the same contractor detail page.
8. Check the profile change history.

Expected result:

- allowed legal/fiscal profile fields update successfully;
- email, status, rates, assignments and bank fields cannot be changed by the
  contractor;
- the admin audit history shows the profile update.

## 7. Admin Bank Detail Update

Use a controlled test contractor until production approval for real bank details
is complete.

1. Sign in as admin.
2. Open the contractor detail page.
3. Update bank account holder, IBAN and SWIFT/BIC in the bank details form.
4. Save.
5. Check the profile change history.
6. Sign in as the contractor and open My Profile.

Expected result:

- admin can update bank details;
- contractors cannot edit bank details;
- audit history stores masked IBAN output, not the full IBAN.

## 8. Document And Invoice Files

1. Confirm `contractor-documents` and `contractor-invoices` buckets are private.
2. Upload a controlled PDF as a contractor document.
3. Download the document as admin.
4. Download the document as the owning contractor.
5. Upload a controlled official invoice PDF after a payment statement exists.
6. Download the invoice as admin.
7. Download the invoice as the owning contractor.

Expected result:

- PDFs upload only to private buckets;
- signed download links work for permitted users;
- operations users cannot download sensitive files by default;
- direct public file URLs do not work.

## 9. Timesheet, Statement, Invoice And Payment Flow

Use a controlled production test record only after production approval.

1. Create or confirm an active project.
2. Assign the contractor to the project with an hourly rate.
3. Sign in as contractor.
4. Create a monthly timesheet.
5. Add one worked-day entry.
6. Submit the timesheet.
7. Sign in as admin.
8. Approve the timesheet.
9. Generate the payment statement.
10. Sign in as contractor.
11. Upload the official invoice PDF.
12. Sign in as admin.
13. Review the invoice.
14. Update manual payment status.

Expected result:

- no task description is required for timesheet entries;
- approved timesheets are locked from normal contractor editing;
- payment statement calculates EUR totals from approved hours and hourly rate;
- the portal does not issue a legal invoice on behalf of the contractor;
- payment status is manual only and does not trigger bank payment processing.

## 10. Accountant Export

1. Sign in as admin.
2. Open Exports.
3. Download the accountant CSV.
4. Open the CSV locally.
5. Sign in as contractor.
6. Try to open `/exports`.

Expected result:

- CSV includes supplier, invoice, VAT, project and manual payment status fields;
- CSV excludes bank details, private file paths and signed document links;
- contractors cannot access the export page or CSV route.

## 11. Failure Handling

If any step fails:

1. Stop production onboarding.
2. Record the failing URL, user role and exact time.
3. Check Vercel deployment logs.
4. Check Supabase Auth, RLS policies and Storage policies.
5. Create a GitHub issue or small fix branch.
6. Retest the failed step after the fix is merged and deployed.

Do not add real contractor personal data until all security and access checks
pass.
