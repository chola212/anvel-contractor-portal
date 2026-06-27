import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function dateIsWithinAssignment(workDate, assignment) {
  return (
    (!assignment.start_date || workDate >= assignment.start_date) &&
    (!assignment.end_date || workDate <= assignment.end_date)
  );
}

function monthOverlapsAssignment(year, month, assignment) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  return (
    (!assignment.start_date || assignment.start_date <= endDate) &&
    (!assignment.end_date || assignment.end_date >= startDate)
  );
}

function selectSingleStatementRate(entries, assignments) {
  const rates = new Set();

  for (const entry of entries) {
    const matches = assignments.filter((assignment) =>
      dateIsWithinAssignment(entry.work_date, assignment),
    );

    if (matches.length !== 1) {
      return false;
    }

    rates.add(`${Number(matches[0].hourly_rate).toFixed(2)}:${matches[0].currency}`);
  }

  return rates.size === 1;
}

assert.equal(
  monthOverlapsAssignment(2026, 7, {
    start_date: "2026-07-15",
    end_date: null,
  }),
  true,
  "timesheet month should overlap assignment starting mid-month",
);
assert.equal(
  monthOverlapsAssignment(2026, 6, {
    start_date: "2026-07-15",
    end_date: "2026-09-10",
  }),
  false,
  "timesheet month before assignment start should be rejected",
);
assert.equal(
  monthOverlapsAssignment(2026, 10, {
    start_date: "2026-07-15",
    end_date: "2026-09-10",
  }),
  false,
  "timesheet month after assignment end should be rejected",
);
assert.equal(
  monthOverlapsAssignment(2026, 8, {
    start_date: "2026-07-15",
    end_date: "2026-09-10",
  }),
  true,
  "current month inside an assignment should be accepted",
);
assert.equal(
  monthOverlapsAssignment(2026, 8, {
    start_date: "2026-07-15",
    end_date: null,
  }),
  true,
  "an assignment without an end date should allow later non-future months",
);
assert.equal(
  dateIsWithinAssignment("2026-07-14", {
    start_date: "2026-07-15",
    end_date: null,
  }),
  false,
  "worked day before assignment start should be rejected",
);
assert.equal(
  dateIsWithinAssignment("2026-09-11", {
    start_date: "2026-07-15",
    end_date: "2026-09-10",
  }),
  false,
  "worked day after a mid-month assignment end should be rejected",
);
assert.equal(
  dateIsWithinAssignment("2026-09-10", {
    start_date: "2026-07-15",
    end_date: "2026-09-10",
  }),
  true,
  "the assignment end date should remain valid",
);
assert.equal(
  selectSingleStatementRate(
    [
      { work_date: "2026-07-15", hours: 8 },
      { work_date: "2026-07-16", hours: 6 },
    ],
    [
      {
        id: "a1",
        start_date: "2026-07-15",
        end_date: "2026-07-31",
        hourly_rate: 90,
        currency: "EUR",
      },
    ],
  ),
  true,
  "statement rate should resolve when all entries share one valid rate",
);
assert.equal(
  selectSingleStatementRate(
    [
      { work_date: "2026-07-15", hours: 8 },
      { work_date: "2026-07-20", hours: 6 },
    ],
    [
      {
        id: "a1",
        start_date: "2026-07-01",
        end_date: "2026-07-17",
        hourly_rate: 90,
        currency: "EUR",
      },
      {
        id: "a2",
        start_date: "2026-07-18",
        end_date: "2026-07-31",
        hourly_rate: 100,
        currency: "EUR",
      },
    ],
  ),
  false,
  "statement generation should reject a month with multiple rates",
);

const timesheetActions = read("src/app/(portal)/timesheets/actions.ts");
assert.match(
  timesheetActions,
  /saveTimesheetCalendarAction/,
  "calendar save action should exist",
);
assert.match(
  timesheetActions,
  /Calendar contains hours outside the assignment period/,
  "calendar save should reject entries outside assignment dates",
);
assert.match(
  timesheetActions,
  /generateSelfBillingInvoiceForTimesheet/,
  "approving a timesheet should generate a self-billing invoice",
);
assert.match(
  timesheetActions,
  /isFutureTimesheetMonth[\s\S]*You cannot create a timesheet for a future month/,
  "starting a timesheet should reject future months server-side",
);
assert.match(
  timesheetActions,
  /startTimesheetAction[\s\S]*monthOverlapsAssignment[\s\S]*You cannot create a timesheet outside the assignment period/,
  "server action should reject a bypassed month outside the assignment period",
);
assert.match(
  timesheetActions,
  /update\(\{ comments: parsed\.data\.comments \}\)/,
  "calendar save should persist the single timesheet comments field",
);
assert.match(
  timesheetActions,
  /existingNotes\.get\(dateKey\)/,
  "calendar save should preserve legacy daily notes",
);
assert.match(
  timesheetActions,
  /commentsError\?\.code === "42703"[\s\S]*latest database migration is pending/,
  "calendar hours should remain saveable while the comments migration is pending",
);

const timesheetQueries = read("src/lib/timesheets/queries.ts");
assert.match(
  timesheetQueries,
  /timesheetCoreColumns[\s\S]*addTimesheetComments/,
  "timesheet routes should load core data separately from optional comments",
);
assert.match(
  timesheetQueries,
  /error\?\.code === "42703"[\s\S]*loading core timesheet data without comments/,
  "timesheet routes should tolerate the comments column during migration rollout",
);
assert.match(
  timesheetQueries,
  /getTimesheetById[\s\S]*\.test\([\s\S]*return null;[\s\S]*const supabase/,
  "timesheet detail lookup should reject malformed ids before querying PostgreSQL",
);
assert.match(
  timesheetActions,
  /submitTimesheetAction[\s\S]*sendAdminNotification[\s\S]*buildTimesheetSubmittedAdminEmail/,
  "timesheet submission should notify the admin inbox",
);
assert.doesNotMatch(
  timesheetActions.match(/submitTimesheetAction[\s\S]*/)?.[0] ?? "",
  /Timesheet reopened/,
  "timesheet submission must not send the reopened contractor email",
);
assert.match(
  timesheetActions,
  /reopenTimesheetAction[\s\S]*Timesheet reopened - \$\{monthLabel\}/,
  "only the admin reopen flow should send the reopened contractor email",
);

const projectActions = read("src/app/(portal)/projects/actions.ts");
assert.match(
  projectActions,
  /project_closed_for_history/,
  "project removal should close projects with business history",
);
assert.match(
  projectActions,
  /revalidatePath\("\/"\)/,
  "project and assignment changes should refresh dashboard status data",
);

const contractorActions = read("src/app/(portal)/contractors/actions.ts");
assert.match(
  contractorActions,
  /generateLink/,
  "contractor onboarding should generate invite links with Supabase Admin",
);
assert.doesNotMatch(
  contractorActions,
  /inviteUserByEmail/,
  "contractor onboarding must not send Supabase-branded invitation emails",
);
assert.match(
  contractorActions,
  /RESEND_API_KEY/,
  "contractor onboarding should require branded email configuration",
);
assert.match(
  contractorActions,
  /PORTAL_EMAIL_FROM|Resend domain verification/,
  "contractor onboarding errors should point admins to Resend sender configuration",
);
assert.match(
  contractorActions,
  /resendContractorInviteAction/,
  "contractor onboarding should support invite resends",
);
assert.match(
  contractorActions,
  /contractor_offboarded/,
  "contractor offboarding should be audited",
);
assert.match(
  contractorActions,
  /listUsers/,
  "contractor onboarding should detect existing auth users safely",
);
assert.match(
  contractorActions,
  /from\("profiles"\)\.upsert[\s\S]*from\("contractors"\)[\s\S]*(insert|update)/,
  "contractor onboarding should save profile and contractor rows before emailing",
);

const forgotPasswordActions = read("src/app/forgot-password/actions.ts");
assert.doesNotMatch(
  forgotPasswordActions,
  /resetPasswordForEmail/,
  "password reset must not send Supabase-branded reset emails",
);
assert.match(
  forgotPasswordActions,
  /generateLink/,
  "password reset should generate a recovery link with Supabase Admin",
);
assert.match(
  forgotPasswordActions,
  /RESEND_API_KEY/,
  "password reset should require branded email configuration",
);

const portalEmail = read("src/lib/email/portal-email.ts");
assert.match(
  portalEmail,
  /ANVEL Consulting <contact@anvelconsulting\.com>/,
  "portal email should use the required ANVEL sender",
);
assert.match(
  portalEmail,
  /Resend rejected the message with/,
  "portal email should log exact Resend rejection details server-side",
);
for (const expectedBuilder of [
  "buildTimesheetSubmittedAdminEmail",
  "buildDocumentUploadedAdminEmail",
  "buildInvoiceUploadedAdminEmail",
  "ADMIN_NOTIFICATION_EMAIL",
]) {
  assert.match(
    portalEmail,
    new RegExp(expectedBuilder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `portal email should expose ${expectedBuilder}`,
  );
}

const authCallback = read("src/app/auth/callback/route.ts");
assert.match(
  authCallback,
  /exchangeCodeForSession/,
  "auth callback should support Supabase code links",
);
assert.match(
  authCallback,
  /verificationPath:[\s\S]*code[\s\S]*token_hash/,
  "auth callback should safely log whether code or token_hash verification was used",
);
assert.match(
  authCallback,
  /queryParamNames/,
  "auth callback should log query parameter names without logging token values",
);
assert.match(
  authCallback,
  /verifyOtp[\s\S]*token_hash/,
  "auth callback should support Supabase token_hash links",
);
assert.match(
  authCallback,
  /searchParams\.get\("token"\)/,
  "auth callback should support token fallback links",
);
assert.match(
  authCallback,
  /getSafeRedirectPath/,
  "auth callback should preserve only safe reset redirects",
);

const startTimesheetForm = read("src/components/timesheets/start-timesheet-form.tsx");
assert.match(
  startTimesheetForm,
  /disabled=\{[\s\S]*Number\(value\) > currentMonth/,
  "timesheet start form should disable future months in the UI",
);
assert.match(
  startTimesheetForm,
  /monthOverlapsAssignment/,
  "timesheet start form should disable months outside the selected assignment",
);

const calendarForm = read(
  "src/components/timesheets/timesheet-calendar-form.tsx",
);
assert.doesNotMatch(
  calendarForm,
  /name=\{`note_/,
  "calendar should no longer render daily note inputs",
);
assert.equal(
  (calendarForm.match(/name="comments"/g) ?? []).length,
  1,
  "calendar should render one whole-timesheet comments field",
);
assert.match(
  calendarForm,
  /data-weekend=\{isWeekend \? "true"/,
  "weekend calendar cells should expose weekend styling",
);
assert.match(
  calendarForm,
  /disabled=\{!isEnabled\}/,
  "weekend inputs should remain enabled when the assignment permits the date",
);

const timesheetMigration = read(
  "supabase/migrations/202606280001_timesheet_comments_and_document_requirements.sql",
);
assert.match(
  timesheetMigration,
  /add column if not exists comments text/,
  "migration should add optional whole-timesheet comments safely",
);

const documentActions = read("src/app/(portal)/documents/actions.ts");
assert.match(
  documentActions,
  /profile\.role === "contractor"[\s\S]*sendAdminNotification[\s\S]*buildDocumentUploadedAdminEmail/,
  "contractor document uploads should notify the admin inbox",
);
const documentRequirements = read("src/lib/documents/requirements.ts");
for (const requirement of [
  "Contractor Agreement",
  "NDA",
  "Assignment Schedule",
  "Other",
]) {
  assert.match(
    documentRequirements,
    new RegExp(requirement),
    `shared document requirements should include ${requirement}`,
  );
  assert.match(
    timesheetMigration,
    new RegExp(requirement),
    `document requirement migration should include ${requirement}`,
  );
}
for (const documentPage of [
  "src/app/(portal)/documents/page.tsx",
  "src/app/(portal)/contractors/[id]/documents/page.tsx",
]) {
  assert.match(
    read(documentPage),
    /getDocumentRequirementFilterOptions/,
    `${documentPage} should derive filters from the upload requirement source`,
  );
}
assert.doesNotMatch(
  documentActions.match(/if \(profile\.role === "admin"\)[\s\S]*?}\n\n  if \(profile\.role === "contractor"\)/)?.[0] ?? "",
  /buildDocumentUploadedAdminEmail/,
  "admin document uploads should not send contractor-upload notifications",
);

const assignmentList = read("src/components/projects/assignment-list.tsx");
assert.doesNotMatch(
  assignmentList,
  /Sales rate[\s\S]{0,300}Hidden for this role/,
  "contractor assignment views should not reveal a hidden sales-rate field",
);

const paymentList = read("src/components/payments/payment-list.tsx");
assert.doesNotMatch(
  paymentList,
  /Defaults to Pending/,
  "contractor payments copy should avoid noisy default details",
);
assert.match(
  paymentList,
  /Payment not recorded yet/,
  "contractor payments should show a clean pending message",
);

const invoiceActions = read("src/app/(portal)/invoices/actions.ts");
assert.match(
  invoiceActions,
  /\.min\(1, "Enter the invoice number\."\)/,
  "invoice number validation should allow one-character invoice numbers",
);

const resetPasswordForm = read(
  "src/components/auth/reset-password-form.tsx",
);
assert.match(
  resetPasswordForm,
  /Password requirements[\s\S]*passwordRules/,
  "reset and invitation password setup should show the shared password rules",
);
assert.match(
  resetPasswordForm,
  /Password updated successfully\. You can now sign in with your new password\./,
  "successful password update should show the required success message",
);
assert.match(
  resetPasswordForm,
  /status !== "success"[\s\S]*disabled=\{status === "submitting"\}/,
  "password submit should be disabled only while the update is pending",
);
assert.match(
  resetPasswordForm,
  /submittingRef\.current/,
  "password update should guard against double submission",
);
assert.match(
  resetPasswordForm,
  /status === "success" \? "Sign in" : "Return to sign in"/,
  "successful password update should present a clear sign-in action",
);
assert.ok(
  resetPasswordForm.indexOf('setStatus("success")') <
    resetPasswordForm.indexOf("void supabase.auth.signOut"),
  "success state should render before non-blocking local sign-out",
);
const passwordPolicy = read("src/lib/auth/password.ts");
for (const rule of [
  "At least 12 characters",
  "At least one uppercase letter",
  "At least one lowercase letter",
  "At least one number",
]) {
  assert.match(
    passwordPolicy,
    new RegExp(rule),
    `visible and enforced password policy should include: ${rule}`,
  );
}

assert.match(
  portalEmail,
  /buildGeneratedAuthLink[\s\S]*hashed_token[\s\S]*token_hash/,
  "branded auth emails should use Supabase's generated hashed token in the app callback",
);
const inviteEmailSection =
  portalEmail.match(/export function buildInviteEmail[\s\S]*?export function buildPasswordResetEmail/)?.[0] ??
  "";
const resetEmailSection =
  portalEmail.match(/export function buildPasswordResetEmail[\s\S]*?export function buildSelfBillingInvoiceEmail/)?.[0] ??
  "";
assert.match(
  inviteEmailSection,
  /<ul>[\s\S]*monthly timesheets[\s\S]*self-billing invoices[\s\S]*payment status/,
  "invitation email should explain the portal purpose in bullet points",
);
assert.doesNotMatch(
  resetEmailSection,
  /company details|monthly timesheets|self-billing invoices|payment status/,
  "password reset email should remain short without invitation-purpose bullets",
);
assert.match(
  portalEmail,
  /Self-billing invoice generated - \$\{invoiceNumber\} - \$\{monthLabel\}/,
  "self-billing email subject should include action, invoice number and month",
);

const operationalHeader = read(
  "src/components/contractors/contractor-operational-header.tsx",
);
assert.match(
  operationalHeader,
  /Back to contractor[\s\S]*rounded-md[\s\S]*focus-visible:ring-2|rounded-md[\s\S]*focus-visible:ring-2[\s\S]*Back to contractor/,
  "operational back links should have compact button styling and visible focus",
);
assert.match(
  invoiceActions,
  /invoice_type: "contractor_uploaded"/,
  "manual contractor invoice upload should remain explicitly contractor_uploaded",
);
assert.match(
  invoiceActions,
  /sendAdminNotification[\s\S]*buildInvoiceUploadedAdminEmail/,
  "contractor invoice uploads should notify the admin inbox",
);
assert.match(
  invoiceActions,
  /Invoice approved for payment - \$\{invoice\.invoice_number\} - \$\{monthLabel\}/,
  "invoice review emails should include invoice number and month",
);

const paymentActions = read("src/app/(portal)/payments/actions.ts");
assert.match(
  paymentActions,
  /Payment marked paid - \$\{invoice\.invoice_number\} - \$\{monthLabel\}/,
  "payment emails should include invoice number and month",
);

for (const [file, forbiddenQuery] of [
  ["src/app/(portal)/documents/page.tsx", "getDocumentsForStaff"],
  ["src/app/(portal)/timesheets/page.tsx", "getTimesheetsForStaff"],
  ["src/app/(portal)/invoices/page.tsx", "getInvoicesForStaff"],
  ["src/app/(portal)/payments/page.tsx", "getPaymentRowsForStaff"],
]) {
  assert.doesNotMatch(
    read(file),
    new RegExp(forbiddenQuery),
    `${file} should not load unfiltered global records for staff by default`,
  );
}

const contractorDetail = read("src/app/(portal)/contractors/[id]/page.tsx");
for (const expectedQuery of [
  "getDocumentsForContractor",
  "getTimesheetsForContractor",
  "getInvoicesForContractor",
  "getPaymentRowsForContractor",
]) {
  assert.doesNotMatch(
    contractorDetail,
    new RegExp(expectedQuery),
    "contractor profile overview should not render every operational section",
  );
}

for (const [file, expectedList, forbiddenList] of [
  [
    "src/app/(portal)/contractors/[id]/documents/page.tsx",
    "DocumentList",
    "TimesheetList|InvoiceList|PaymentList",
  ],
  [
    "src/app/(portal)/contractors/[id]/timesheets/page.tsx",
    "TimesheetList",
    "DocumentList|InvoiceList|PaymentList",
  ],
  [
    "src/app/(portal)/contractors/[id]/invoices/page.tsx",
    "InvoiceList",
    "DocumentList|TimesheetList|PaymentList",
  ],
  [
    "src/app/(portal)/contractors/[id]/payments/page.tsx",
    "PaymentList",
    "DocumentList|TimesheetList|InvoiceList",
  ],
]) {
  const content = read(file);
  assert.match(content, new RegExp(expectedList), `${file} should render its section`);
  assert.doesNotMatch(
    content,
    new RegExp(forbiddenList),
    `${file} should not render unrelated sections`,
  );
  assert.match(content, /OperationalFilterForm/, `${file} should include filters`);
}

const operationalSelector = read(
  "src/components/contractors/contractor-operational-selector.tsx",
);
assert.match(
  operationalSelector,
  /\/contractors\/\$\{contractor\.id\}\/\$\{section\}/,
  "staff operational selector should open section-specific contractor routes",
);

const dashboard = read("src/app/(portal)/page.tsx");
assert.match(
  dashboard,
  /profile\.role === "contractor"/,
  "contractor dashboard should have a role-specific branch",
);
assert.match(
  dashboard,
  /My self-billing invoices/,
  "contractor dashboard should show own self-billing invoice link",
);

const selfBilling = read("src/lib/self-billing/generate.ts");
assert.match(
  selfBilling,
  /existingInvoice/,
  "self-billing generation should check for existing invoice first",
);
assert.match(
  selfBilling,
  /createSelfBillingInvoicePdf/,
  "self-billing generation should create a PDF",
);
assert.match(
  selfBilling,
  /buildSelfBillingInvoiceEmail\([^)]*monthLabel[^)]*invoiceNumber[^)]*project\.name/s,
  "self-billing generation should email the invoice with month, number and project",
);
assert.match(
  selfBilling,
  /email_status/,
  "self-billing generation should update invoice email status",
);
assert.match(
  selfBilling,
  /eq\("timesheet_id", timesheet\.id\)[\s\S]*eq\("invoice_type", "self_billing"\)/,
  "self-billing generation should prevent duplicate invoices per timesheet",
);

const selfBillingMigration = read(
  "supabase/migrations/202606270003_repair_self_billing_invoice_columns.sql",
);
for (const expectedColumn of [
  "timesheet_id",
  "invoice_type",
  "generated_by",
  "generated_at",
  "emailed_at",
  "email_status",
]) {
  assert.match(
    selfBillingMigration,
    new RegExp(expectedColumn),
    `self-billing migration should include ${expectedColumn}`,
  );
}
assert.match(
  selfBillingMigration,
  /on delete set null/,
  "self-billing migration should use on delete set null for nullable references",
);
assert.match(
  selfBillingMigration,
  /invoices_self_billing_timesheet_unique_idx/,
  "self-billing migration should enforce one self-billing invoice per timesheet",
);

const resetScript = read("scripts/reset-operational-data.mjs");
assert.match(
  resetScript,
  /ALLOW_OPERATIONAL_DATA_RESET/,
  "reset script should require explicit confirmation",
);
assert.doesNotMatch(
  resetScript,
  /from\("contractors"\)\.delete|from\("profiles"\)\.delete|auth\.admin\.deleteUser/,
  "reset script must preserve contractors, profiles and auth users",
);

const productionResetScript = read("scripts/reset-production-test-data.mjs");
assert.match(
  productionResetScript,
  /ALLOW_PRODUCTION_TEST_DATA_RESET/,
  "production test reset should require explicit confirmation",
);
assert.match(
  productionResetScript,
  /andres@anvelconsulting\.com/,
  "production test reset should preserve the named admin account",
);
assert.match(
  productionResetScript,
  /andresvelascofdez@gmail\.com/,
  "production test reset should preserve the named contractor account",
);
assert.match(
  productionResetScript,
  /ALLOW_AUTH_USER_PRUNE/,
  "auth user pruning should require a separate guard",
);

const visibleCopyFiles = [
  "src/app/account-required/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/reset-password/page.tsx",
  "src/components/documents/document-list.tsx",
  "src/components/documents/document-upload-form.tsx",
  "src/components/invoices/invoice-upload-form.tsx",
  "src/components/timesheets/timesheet-list.tsx",
  "src/components/contractors/contractor-list.tsx",
  "src/components/projects/project-list.tsx",
];

for (const file of visibleCopyFiles) {
  const content = read(file);
  assert.doesNotMatch(
    content,
    /fake development|private .*bucket|MVP|later/,
    `${file} should not contain production-facing scaffolding copy`,
  );
}

const readme = read("README.md");
for (const expectedEmailTerm of ["SPF", "DKIM", "DMARC", "Resend"]) {
  assert.match(
    readme,
    new RegExp(expectedEmailTerm),
    `README should document ${expectedEmailTerm} email troubleshooting`,
  );
}
for (const expectedAuthEmailTerm of [
  "Password changed",
  "SMTP Settings",
  "smtp.resend.com",
  "noreply@mail.app.supabase.io",
]) {
  assert.match(
    readme,
    new RegExp(expectedAuthEmailTerm.replaceAll(".", "\\.")),
    `README should document Supabase auth email configuration: ${expectedAuthEmailTerm}`,
  );
  assert.match(
    read("05_DEPLOYMENT_READINESS_CHECKLIST.md"),
    new RegExp(expectedAuthEmailTerm.replaceAll(".", "\\.")),
    `production checklist should cover: ${expectedAuthEmailTerm}`,
  );
}

const authenticatedRoutes = read("scripts/authenticated-route-smoke-test.mjs");
assert.match(
  authenticatedRoutes,
  /SMOKE_CONTRACTOR_ID[\s\S]*\/contractors\/\$\{smokeContractorId\}\/timesheets/,
  "authenticated smoke tests should cover the admin contractor timesheet route",
);
assert.match(
  authenticatedRoutes,
  /SMOKE_TIMESHEET_ID[\s\S]*\/timesheets\/\$\{smokeTimesheetId\}/,
  "authenticated smoke tests should cover timesheet detail for admin and contractor",
);
assert.match(
  authenticatedRoutes,
  /timesheets\/not-a-valid-timesheet-id[\s\S]*clean 404|clean 404[\s\S]*timesheets\/not-a-valid-timesheet-id/,
  "authenticated smoke tests should verify malformed timesheet ids do not crash",
);

console.log("Business regression checks passed.");
