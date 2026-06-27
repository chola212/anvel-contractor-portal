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
  dateIsWithinAssignment("2026-07-14", {
    start_date: "2026-07-15",
    end_date: null,
  }),
  false,
  "worked day before assignment start should be rejected",
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

const projectActions = read("src/app/(portal)/projects/actions.ts");
assert.match(
  projectActions,
  /project_closed_for_history/,
  "project removal should close projects with business history",
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
assert.match(
  invoiceActions,
  /invoice_type: "contractor_uploaded"/,
  "manual contractor invoice upload should remain explicitly contractor_uploaded",
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
  /buildSelfBillingInvoiceEmail/,
  "self-billing generation should email the invoice",
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

console.log("Business regression checks passed.");
