# ANVEL Contractor Portal - Production Operations Runbook

This runbook is for routine operation of the live ANVEL Contractor Portal after the initial production smoke test has passed.

Use this only for the production deployment and production Supabase project.

## Production References

- Portal: `https://portal.anvelconsulting.com`
- Supabase production project ref: `rodduqyvlcltylzuheex`
- Primary production admin account: `andres@anvelconsulting.com`
- Controlled smoke-test contractor accounts have been disabled/banned after production testing.

Do not put service-role keys in the application, browser, Vercel public variables, GitHub, local notes, or chat.

## Operating Rules

- Production may contain real contractor data only after ANVEL approves the contractor and the data is needed for operations.
- Development and local testing must use fake data only.
- Public registration must remain unavailable.
- Contractors must only see their own profile, documents, timesheets, invoices, and payments.
- Admin users can manage all operational records.
- Operations users must remain limited where the app defines that role.
- Bank details are sensitive and must stay admin-only with audit logging.
- Payments are tracked manually. The portal must not trigger bank payments.
- The portal must not issue legal invoices on behalf of contractors.

## Daily Checks

Run these on active working days when the portal is being used.

1. Open `https://portal.anvelconsulting.com`.
2. Sign in as the production admin.
3. Open these routes:
   - Dashboard
   - Contractors
   - Projects
   - Documents
   - Timesheets
   - Invoices
   - Payments
   - Exports
   - Settings
4. Confirm Settings shows the production Supabase project, not development.
5. Review visible queues:
   - documents needing review
   - submitted timesheets
   - invoice review items
   - open payment statuses
6. Confirm no unexpected public registration, invitation, or self-signup flow is visible.

## Weekly Checks

Run these once per week while the portal is in use.

1. In Vercel, confirm the production deployment is `Ready`.
2. Confirm the production domain is still valid:
   - `portal.anvelconsulting.com`
3. Confirm production environment variables point to the production Supabase project:
   - `NEXT_PUBLIC_SUPABASE_URL` should use `rodduqyvlcltylzuheex`.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` should be the production anon/publishable key.
4. In Supabase production Storage, confirm these buckets are private:
   - `contractor-documents`
   - `contractor-invoices`
5. Confirm both storage buckets allow PDF files only and keep the 10 MB file limit.
6. If ANVEL intentionally keeps a controlled smoke-test contractor active, sign in with that account.
7. Confirm the contractor can open:
   - Dashboard
   - My Profile
   - Documents
   - Timesheets
   - Invoices
   - Payments
8. Confirm the contractor cannot open admin-only routes such as:
   - `/contractors`
   - `/projects`
   - `/exports`
   - `/settings`
9. Sign back in as admin and confirm audit history still shows recent profile and bank-detail changes.

If no controlled smoke-test contractor account is active, skip steps 6-8 and verify contractor access during the next approved contractor onboarding or release smoke test.

## Monthly Checks

Run these at least once per month.

1. Review Supabase Auth users and remove or disable accounts that should no longer have portal access.
2. Review inactive contractors and ended assignments.
3. Confirm accountant export output still matches expected operational records.
4. Confirm production Vercel and Supabase access is limited to the correct people.
5. Confirm Cloudflare DNS still points the portal domain to Vercel.
6. Record any operational issues, fixes, and manual data corrections.

## Contractor Onboarding

Use `07_PRODUCTION_ONBOARDING_RUNBOOK.md` for the full production onboarding checklist.

At a high level:

1. Create the contractor Auth user in production Supabase.
2. Add the matching `profiles` row.
3. Add the matching `contractors` row.
4. Create or select the project.
5. Create the contractor assignment.
6. Confirm the contractor can sign in.
7. Confirm the contractor sees only their own records.
8. Confirm admin can see the contractor and assignment.

Do not onboard real contractor data until the contractor has been accepted and the data has been approved for production use.

## Contractor Offboarding

When a contractor should no longer have access:

1. End or deactivate their active assignment.
2. Set the contractor record to inactive where appropriate.
3. Disable or remove the Supabase Auth user.
4. Keep audit logs and historical operational records.
5. Do not delete production records unless there is an approved data-retention decision.

## Incident Response

Use this if something looks wrong in production.

1. Stop adding or changing production records until the issue is understood.
2. Record:
   - user account involved
   - route or workflow involved
   - time of issue
   - screenshots where safe
   - affected contractor/project/invoice/timesheet IDs if available
3. If access control looks wrong, disable the affected account immediately.
4. Check Supabase audit logs and app audit history.
5. Check Vercel deployment history for recent merges.
6. If an environment variable was exposed or set incorrectly, rotate it and redeploy.
7. If data needs correction, prepare reviewed SQL and run it only in the correct Supabase project.
8. Record the fix and the verification result.

## Rollback

If a production app deployment is broken:

1. Open Vercel project deployments.
2. Find the last known good production deployment.
3. Promote or roll back to that deployment.
4. Confirm the portal loads.
5. Confirm login still works.
6. Confirm Settings still points to production Supabase.
7. Open a follow-up issue or PR for the broken release.

Do not roll back or delete database changes casually. Database corrections must be reviewed separately.

## Ready To Continue Criteria

Production is considered operational when:

- admin login works;
- controlled contractor login was tested, and test contractor access was disabled after completion;
- contractor isolation is confirmed;
- private document and invoice downloads work;
- profile and bank-detail audit entries are visible;
- timesheet, payment statement, invoice, payment, and export smoke flows pass;
- Vercel production deployment is ready;
- production Supabase environment variables are correct.
