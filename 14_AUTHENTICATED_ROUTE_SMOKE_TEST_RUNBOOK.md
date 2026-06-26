# ANVEL Contractor Portal - Authenticated Route Smoke Test Runbook

This runbook verifies that production role routing still works after a deployment.
It checks controlled admin and contractor sessions without storing passwords,
service-role keys, or browser cookies in the repository.

## When To Run

Run this after significant production changes, especially changes to:

- authentication;
- role-aware navigation;
- RLS-sensitive pages;
- document, invoice, payment, export, or settings routes.

## What It Checks

The script checks:

- admin can open operational pages;
- contractor can open contractor-facing pages;
- contractor cannot open admin-only routes such as `Exports`, `Contractors`,
  `Projects`, and `Settings`.

It does not upload files, submit timesheets, create payment statements, or test
visual layout.

## Safety Rules

- Use controlled smoke-test accounts only.
- Do not use real contractor personal data for this test.
- Do not paste cookies into GitHub, documentation, chat, or source files.
- Do not use Supabase service-role keys.
- Clear the cookie environment variables after the test.

## Step-By-Step

1. Open VS Code Terminal.

2. Go to the app folder:

   ```powershell
   cd C:\Users\andre\Desktop\Portal\anvel-contractor-portal
   ```

3. Point the smoke test at production:

   ```powershell
   $env:SMOKE_BASE_URL="https://portal.anvelconsulting.com"
   ```

4. In the browser, sign in to production as the controlled admin user.

5. Open browser developer tools.

6. Open the `Network` tab.

7. Reload the portal dashboard.

8. Click one request to `portal.anvelconsulting.com`.

9. In `Headers`, find `Request Headers`.

10. Copy the full `Cookie` header value.

11. Paste it into the terminal as the admin cookie:

    ```powershell
    $env:SMOKE_ADMIN_COOKIE='paste-admin-cookie-value-here'
    ```

12. Sign out of the portal.

13. Sign in to production as the controlled contractor smoke-test user.

14. Repeat steps 5 to 10 and copy the contractor `Cookie` header value.

15. Paste it into the terminal as the contractor cookie:

    ```powershell
    $env:SMOKE_CONTRACTOR_COOKIE='paste-contractor-cookie-value-here'
    ```

16. Run the authenticated route smoke test:

    ```powershell
    & "C:\Program Files\nodejs\npm.cmd" run test:routes:auth
    ```

17. Confirm the output ends with:

    ```text
    Authenticated route smoke test passed.
    ```

18. Clear the temporary cookie variables:

    ```powershell
    Remove-Item Env:\SMOKE_ADMIN_COOKIE
    Remove-Item Env:\SMOKE_CONTRACTOR_COOKIE
    Remove-Item Env:\SMOKE_BASE_URL
    ```

## Expected Result

The test should print `OK` lines for admin pages, contractor pages, and
contractor blocked-route checks.

## Troubleshooting

If the test fails:

- sign out and sign in again, then copy fresh cookies;
- confirm the production domain is `https://portal.anvelconsulting.com`;
- confirm the smoke-test accounts are active and not banned;
- confirm Vercel Production variables point to the production Supabase project;
- confirm the latest production deployment is ready.

If the browser cookie is copied incorrectly, the script may report redirects or
missing page text. Copy the complete `Cookie` request header again.
