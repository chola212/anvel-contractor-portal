import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
const projectDetail = read("src/app/(portal)/projects/[id]/page.tsx");
for (const expected of [
  "getProjectById",
  "ProjectUpdateForm",
  "ProjectBillingDetailsForm",
  "getProjectBillingDetails",
]) {
  assert.match(
    projectDetail,
    new RegExp(expected),
    `project detail should load and render ${expected} after current migrations`,
  );
}
assert.match(
  projectActions,
  /updateProjectAction[\s\S]*from\("projects"\)[\s\S]*\.update\(nextProject\)/,
  "admin project updates should remain wired to the projects table",
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
const resendContractorInviteSection =
  contractorActions.match(
    /export async function resendContractorInviteAction[\s\S]*?export async function updateContractorBankDetailsAction/,
  )?.[0] ?? "";
assert.match(
  resendContractorInviteSection,
  /requireRole\(\["admin"\]\)/,
  "resending contractor invitations should be admin-only",
);
assert.match(
  resendContractorInviteSection,
  /contractorId: formData\.get\("contractorId"\)/,
  "resending contractor invitations should require a contractor id",
);
assert.match(
  resendContractorInviteSection,
  /This contractor could not be found\./,
  "resending contractor invitations should return a safe missing-contractor error",
);
assert.match(
  resendContractorInviteSection,
  /Contractor email is missing\./,
  "resending contractor invitations should reject missing or invalid contractor emails",
);
assert.match(
  resendContractorInviteSection,
  /contractor\.profile_id[\s\S]*"recovery"[\s\S]*"invite"/,
  "resending contractor invitations should use recovery links for existing contractor auth accounts and invite links only for missing auth users",
);
assert.match(
  resendContractorInviteSection,
  /findAuthUserByEmail[\s\S]*from\("profiles"\)\.upsert[\s\S]*from\("contractors"\)[\s\S]*update\(\{ profile_id: linkedAuthUser\.id \}\)/,
  "resending contractor invitations should link existing auth users without creating duplicate contractor rows",
);
assert.match(
  resendContractorInviteSection,
  /buildInviteEmail\(contractorName, inviteLink\)[\s\S]*sendPortalEmail/,
  "resending contractor invitations should reuse the existing invitation email template",
);
assert.match(
  resendContractorInviteSection,
  /contractor_invitation_resent[\s\S]*link_type: linkType/,
  "resending contractor invitations should audit the requested action name and link type",
);
assert.doesNotMatch(
  resendContractorInviteSection,
  /console\.(log|info|error)\([^)]*inviteLink/,
  "resending contractor invitations must not log the generated link",
);
assert.doesNotMatch(
  resendContractorInviteSection,
  /message:\s*inviteLink|fieldErrors:\s*inviteLink/,
  "resending contractor invitations must not expose the generated link in action state",
);
assert.match(
  read("src/components/contractors/contractor-resend-invite-form.tsx"),
  /Resend invitation email/,
  "contractor detail should render the requested resend invitation button label",
);
assert.match(
  contractorActions,
  /contractor_offboarded/,
  "contractor offboarding should be audited",
);
assert.match(
  contractorActions,
  /fiscalAddressLine1[\s\S]*fiscal_address: parsed\.data\.fiscalAddress[\s\S]*fiscal_address_line_1[\s\S]*fiscal_address_line_2/,
  "admin contractor updates should save split fiscal address lines and the legacy combined address",
);
for (const contractorForm of [
  "src/components/contractors/contractor-create-form.tsx",
  "src/components/contractors/contractor-update-form.tsx",
  "src/components/contractors/contractor-self-update-form.tsx",
]) {
  assert.match(
    read(contractorForm),
    /Fiscal address line 1[\s\S]*Fiscal address line 2/,
    `${contractorForm} should render fiscal address line 1 and line 2`,
  );
}
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
  "password reset should use branded email configuration when available",
);
assert.match(
  forgotPasswordActions,
  /neutralResetMessage[\s\S]*If this email exists in the portal, a password reset link has been sent/,
  "forgot-password should use a neutral response for valid submitted emails",
);
assert.doesNotMatch(
  forgotPasswordActions,
  /Contact ANVEL support|Could not send the password reset email|Could not prepare the password reset email/,
  "forgot-password should not expose service-role or email-provider failures to users",
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
assert.match(
  portalEmail,
  /NODE_ENV === "production"[\s\S]*NEXT_PUBLIC_SITE_URL must be configured in production/,
  "production auth links should fail closed when NEXT_PUBLIC_SITE_URL is missing",
);
assert.match(
  portalEmail,
  /function escapeEmailHtml[\s\S]*replaceAll\("&", "&amp;"\)[\s\S]*replaceAll\("<", "&lt;"\)[\s\S]*replaceAll\(">", "&gt;"\)/,
  "portal email should provide HTML escaping for dynamic values",
);
assert.match(
  portalEmail,
  /buildOutgoingInvoiceEmail[\s\S]*safeConsultantName[\s\S]*safeProjectName[\s\S]*safeInvoiceNumber/,
  "outgoing invoice email HTML should escape consultant, project and invoice values",
);
assert.match(
  portalEmail,
  /buildNotificationEmail[\s\S]*escapeEmailLines\(body\)/,
  "notification emails should preserve line breaks after escaping HTML",
);
for (const expectedBuilder of [
  "buildTimesheetSubmittedAdminEmail",
  "buildDocumentUploadedAdminEmail",
  "buildInvoiceUploadedAdminEmail",
  "buildSelfBillingCancellationEmail",
  "buildOutgoingInvoiceCancellationEmail",
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

const reopenMigration = read(
  "supabase/migrations/202606280003_timesheet_reopen_invoice_cancellation.sql",
);
assert.match(
  reopenMigration,
  /using \([\s\S]*status in \('draft', 'rejected', 'reopened'\)[\s\S]*with check \([\s\S]*status in \('draft', 'rejected', 'reopened', 'submitted'\)/,
  "contractor timesheet RLS should allow editable source states and submitted as a destination",
);
assert.match(
  reopenMigration,
  /create table if not exists public\.timesheet_reopen_events[\s\S]*reason text not null[\s\S]*between 5 and 1000/,
  "reopen history should retain a validated mandatory reason",
);
assert.match(
  reopenMigration,
  /reopen_timesheet_with_invoice_cancellation[\s\S]*update public\.invoices[\s\S]*status = 'cancelled'[\s\S]*update public\.outgoing_invoices[\s\S]*status = 'cancelled'/,
  "the transactional reopen RPC should cancel both linked invoice types",
);
assert.match(
  reopenMigration,
  /invoices_self_billing_timesheet_unique_idx[\s\S]*status <> 'cancelled'[\s\S]*outgoing_invoices_active_timesheet_unique_idx[\s\S]*status <> 'cancelled'/,
  "replacement invoice uniqueness should ignore cancelled historical records",
);
assert.match(
  reopenMigration,
  /pg_notify\('pgrst', 'reload schema'\)/,
  "the schema cache should reload after the migration",
);

const reviewForm = read(
  "src/components/timesheets/timesheet-review-form.tsx",
);
assert.match(
  reviewForm,
  /name="reopenReason"[\s\S]*required[\s\S]*minLength=\{5\}[\s\S]*maxLength=\{1000\}/,
  "the reopen UI should require a 5 to 1000 character reason",
);
assert.match(
  timesheetActions,
  /reopen_timesheet_with_invoice_cancellation[\s\S]*sendReopenCancellationEmails/,
  "the reopen action should use the transactional RPC and then send cancellation notices",
);
const reopenActionSection =
  timesheetActions.match(
    /export async function reopenTimesheetAction[\s\S]*?async function getEditableOwnTimesheet/,
  )?.[0] ?? "";
assert.ok(
  reopenActionSection.indexOf('"reopen_timesheet_with_invoice_cancellation"') <
    reopenActionSection.indexOf("sendReopenCancellationEmails({"),
  "invoice cancellation must commit before external email delivery is attempted",
);
assert.match(
  timesheetActions,
  /cancellationEmailFailures > 0[\s\S]*warningParts[\s\S]*status: "success"/,
  "cancellation email failures should warn without rolling back the reopen",
);
assert.match(
  timesheetActions,
  /commentsError\?\.code === "42501"[\s\S]*migration 202606280003 has not been applied/,
  "a missing comments RLS migration should produce a clear warning",
);

const documentActions = read("src/app/(portal)/documents/actions.ts");
const postTestMigration = read(
  "supabase/migrations/202606280004_post_test_invoice_document_fixes.sql",
);
assert.match(
  documentActions,
  /profile\.role === "contractor"[\s\S]*sendAdminNotification[\s\S]*buildDocumentUploadedAdminEmail/,
  "contractor document uploads should notify the admin inbox",
);
assert.match(
  documentActions,
  /validatePdfUploadFile[\s\S]*Select a PDF file to upload\./,
  "contractor document uploads should use shared PDF validation",
);
assert.match(
  read("src/app/(portal)/invoices/actions.ts"),
  /validatePdfUploadFile[\s\S]*Select the official invoice PDF\./,
  "contractor invoice uploads should use shared PDF validation",
);
const pdfUploadHelper = read("src/lib/files/pdf-upload.ts");
assert.match(
  pdfUploadHelper,
  /maxPdfUploadSizeBytes = 10 \* 1024 \* 1024/,
  "PDF upload validation should keep the 10 MB limit",
);
assert.match(
  pdfUploadHelper,
  /value\.type !== "application\/pdf"[\s\S]*!value\.name\.toLowerCase\(\)\.endsWith\("\.pdf"\)/,
  "PDF upload validation should keep MIME and extension checks",
);
assert.match(
  pdfUploadHelper,
  /slice\(0, 5\)[\s\S]*header !== "%PDF-"/,
  "PDF upload validation should reject files without the PDF magic header",
);
const documentRequirements = read("src/lib/documents/requirements.ts");
for (const requirement of [
  "Contractor Agreement",
  "Signed NDA",
  "Other",
]) {
  assert.match(
    documentRequirements,
    new RegExp(requirement),
    `shared document requirements should include ${requirement}`,
  );
  assert.match(
    postTestMigration,
    new RegExp(requirement),
    `document requirement migration should include ${requirement}`,
  );
}
assert.doesNotMatch(
  documentRequirements,
  /Assignment Schedule/,
  "shared document requirements should no longer expose Assignment Schedule in the upload/filter dropdowns",
);
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
assert.match(
  read("src/components/documents/document-list.tsx"),
  /href=\{`\/documents\/\$\{document\.id\}\/download`\}[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"/,
  "document download links should open without replacing the portal tab",
);
assert.match(
  read("src/app/(portal)/documents/[id]/download/route.ts"),
  /createSignedUrl\(document\.file_path,[\s\S]*download: document\.file_name/,
  "document download route should request a named private signed download",
);

const projectDocumentsMigration = read(
  "supabase/migrations/202606280008_project_documents.sql",
);
const projectDocumentActions = read(
  "src/app/(portal)/project-documents/actions.ts",
);
const projectDocumentsPage = read(
  "src/app/(portal)/project-documents/page.tsx",
);
const projectDocumentList = read(
  "src/components/project-documents/project-document-list.tsx",
);
const projectDocumentUploadForm = read(
  "src/components/project-documents/project-document-upload-form.tsx",
);
const projectDocumentDownloadRoute = read(
  "src/app/(portal)/project-documents/[id]/download/route.ts",
);
assert.match(
  projectDocumentsMigration,
  /create table if not exists public\.project_documents[\s\S]*project_id uuid not null references public\.projects\(id\) on delete cascade[\s\S]*contractor_id uuid references public\.contractors\(id\) on delete set null/,
  "project documents migration should create a project-linked table separate from contractor documents",
);
assert.match(
  projectDocumentsMigration,
  /alter table public\.project_documents enable row level security[\s\S]*project_documents_admin_all[\s\S]*public\.is_admin\(\)/,
  "project documents table should be admin-only through RLS",
);
assert.doesNotMatch(
  projectDocumentsMigration,
  /operations|profile_id = auth\.uid\(\)/,
  "project documents migration must not grant operations or contractor access",
);
assert.match(
  projectDocumentsMigration,
  /'project-documents'[\s\S]*false[\s\S]*10485760[\s\S]*array\['application\/pdf'\]/,
  "project documents migration should create a private PDF-only 10 MB bucket",
);
assert.match(
  projectDocumentsMigration,
  /project_documents_storage_admin_all[\s\S]*bucket_id = 'project-documents'[\s\S]*public\.is_admin\(\)/,
  "project document storage should be admin-only",
);
assert.doesNotMatch(
  projectDocumentActions,
  /sendAdminNotification|sendContractorNotification|contractor-documents|contractor_documents/,
  "project document actions must not reuse contractor document email logic or buckets",
);
assert.match(
  projectDocumentActions,
  /projectDocumentBucket = "project-documents"/,
  "project document actions should use the project-documents bucket",
);
assert.match(
  projectDocumentActions,
  /validatePdfUploadFile[\s\S]*Select a PDF file to upload\./,
  "project document uploads should reuse shared PDF validation and reject fake PDFs",
);
assert.match(
  projectDocumentActions,
  /uploadProjectDocumentSchema[\s\S]*projectId: z\.string\(\)\.uuid\("Select a project\."\)/,
  "project document uploads should require project_id",
);
assert.match(
  projectDocumentActions,
  /projects\/\$\{parsed\.data\.projectId\}\/documents\/\$\{documentId\}-\$\{fileName\}/,
  "project document uploads should store files under the project document path",
);
for (const actionName of [
  "uploadProjectDocumentAction",
  "updateProjectDocumentMetadataAction",
  "archiveProjectDocumentAction",
  "unarchiveProjectDocumentAction",
  "deleteProjectDocumentAction",
]) {
  assert.match(
    projectDocumentActions,
    new RegExp(`export async function ${actionName}`),
    `project documents should expose ${actionName}`,
  );
}
for (const auditAction of [
  "project_document_uploaded",
  "project_document_updated",
  "project_document_archived",
  "project_document_unarchived",
  "project_document_deleted",
]) {
  assert.match(
    projectDocumentActions,
    new RegExp(auditAction),
    `project document action should audit ${auditAction}`,
  );
}
assert.match(
  projectDocumentsPage,
  /requireRole\(\["admin"\]\)[\s\S]*ProjectDocumentUploadForm[\s\S]*ProjectDocumentList/,
  "project documents page should be admin-only and render upload/list UI",
);
assert.match(
  projectDocumentsPage,
  /name="projectId"[\s\S]*name="contractorId"[\s\S]*name="status"/,
  "project documents page should provide project, contractor and status filters",
);
assert.match(
  projectDocumentUploadForm,
  /Admin-only\. Contractors cannot access these files\.[\s\S]*accept="application\/pdf,\.pdf"/,
  "project document upload UI should clearly remain admin-only and PDF-only",
);
assert.match(
  projectDocumentList,
  /href=\{`\/project-documents\/\$\{document\.id\}\/download`\}/,
  "project document list should expose project document download links",
);
for (const listAction of [
  "archiveProjectDocumentAction",
  "unarchiveProjectDocumentAction",
  "deleteProjectDocumentAction",
]) {
  assert.match(
    projectDocumentList,
    new RegExp(listAction),
    `project document list should expose ${listAction}`,
  );
}
assert.match(
  projectDocumentList,
  /Archive[\s\S]*Unarchive[\s\S]*Delete|Delete[\s\S]*Archive[\s\S]*Unarchive/,
  "project document list should expose archive, unarchive and delete UI",
);
assert.match(
  projectDocumentDownloadRoute,
  /profile\.role !== "admin"[\s\S]*status: 403[\s\S]*from\(projectDocumentBucket\)[\s\S]*createSignedUrl\(document\.file_path,[\s\S]*download: document\.file_name/,
  "project document download route should check admin before creating a named signed URL",
);
assert.match(
  read("src/app/(portal)/projects/[id]/page.tsx"),
  /getProjectDocuments\(\{ projectId: project\.id \}\)[\s\S]*Open project documents/,
  "project detail should link admins to project documents for the selected project",
);
assert.match(
  read("src/constants/navigation.ts"),
  /label: "Project Documents"[\s\S]*href: "\/project-documents"[\s\S]*allowedRoles: \["admin"\]/,
  "Project Documents navigation should be admin-only",
);
assert.match(
  read("src/components/invoices/invoice-list.tsx"),
  /href=\{`\/invoices\/\$\{invoice\.id\}\/download`\}[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"/,
  "invoice download links should open without replacing the portal tab",
);
assert.match(
  read("src/app/(portal)/outgoing-invoices/[id]/page.tsx"),
  /href=\{`\/outgoing-invoices\/\$\{invoice\.id\}\/download`\}[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"[\s\S]*Advanced details/,
  "outgoing invoice download should open in a new tab and technical details should be secondary",
);
assert.match(
  read("src/app/(portal)/exports/page.tsx"),
  /href=\{`\/exports\/accountant\?\$\{exportParams\.toString\(\)\}`\}[\s\S]*target="_blank"[\s\S]*Preview of exported rows/,
  "CSV export download should open without replacing the portal tab",
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
  /invoice\.status === "cancelled"[\s\S]*Cancelled invoices cannot be reviewed or restored/,
  "cancelled contractor invoices should be immutable in the review action",
);
const cancellationPaymentActions = read(
  "src/app/(portal)/payments/actions.ts",
);
assert.match(
  cancellationPaymentActions,
  /invoice\.status === "cancelled"[\s\S]*Cancelled invoices cannot receive payment updates/,
  "cancelled contractor invoices should reject payment updates server-side",
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
  read("src/app/(portal)/profile/actions.ts"),
  /fiscalAddressLine1[\s\S]*p_fiscal_address: parsed\.data\.fiscalAddress/,
  "contractor self-profile update should submit the split fiscal address as the legacy combined address for the RPC",
);

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
const inviteCtaIndex = inviteEmailSection.indexOf(
  "Set password and access portal",
);
const inviteFallbackIndex = inviteEmailSection.indexOf(
  '>${safeInviteLink}</a>',
);
const invitePurposeListIndex = inviteEmailSection.indexOf("<ul>");
assert.ok(
  inviteCtaIndex >= 0 && inviteCtaIndex < invitePurposeListIndex,
  "invitation email HTML should place the primary CTA before the purpose list",
);
assert.ok(
  inviteFallbackIndex >= 0 && inviteFallbackIndex < invitePurposeListIndex,
  "invitation email HTML should place the raw fallback link before the purpose list",
);
assert.equal(
  (inviteEmailSection.match(/background: #115e59/g) ?? []).length,
  1,
  "invitation email should include exactly one primary styled CTA",
);
const inviteTextStart = inviteEmailSection.indexOf("text: `Hello");
const inviteTextLinkIndex = inviteEmailSection.indexOf(
  "${inviteLink}",
  inviteTextStart,
);
const inviteTextPurposeIndex = inviteEmailSection.indexOf(
  "This portal is used to:",
  inviteTextStart,
);
assert.ok(
  inviteTextLinkIndex >= 0 && inviteTextLinkIndex < inviteTextPurposeIndex,
  "invitation email text should place the secure link before the purpose list",
);
assert.doesNotMatch(
  resetEmailSection,
  /company details|monthly timesheets|self-billing invoices|payment status/,
  "password reset email should remain short without invitation-purpose bullets",
);
assert.ok(
  resetEmailSection.indexOf('href="${safeResetLink}"') <
    resetEmailSection.indexOf("If you did not request this"),
  "password reset HTML should show its secure link near the top",
);
assert.ok(
  resetEmailSection.indexOf("${resetLink}", resetEmailSection.indexOf("text: `")) <
    resetEmailSection.indexOf("If you did not request this", resetEmailSection.indexOf("text: `")),
  "password reset text should show its secure link near the top",
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
  /eq\("invoice_type", "self_billing"\)[\s\S]*neq\("status", "cancelled"\)/,
  "self-billing generation should ignore cancelled historical invoices",
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
assert.match(
  selfBilling,
  /from\("company_invoice_settings"\)/,
  "self-billing generation should reuse company invoice settings for the customer details",
);
assert.match(
  selfBilling,
  /Complete company invoice settings before approving this timesheet for self-billing/,
  "self-billing generation should block clearly when company invoice settings are missing",
);
assert.match(
  selfBilling,
  /select\("id,legal_name,email,vat_treatment,vat_number,fiscal_address,fiscal_address_line_1,fiscal_address_line_2,country"\)/,
  "self-billing generation should load contractor supplier address fields",
);
assert.match(
  selfBilling,
  /contractorAddressLine1: contractor\.fiscal_address_line_1[\s\S]*contractorAddressLine2: contractor\.fiscal_address_line_2[\s\S]*companyAddressLine1: settings\.company_address_line_1[\s\S]*companyAddressLine2: settings\.company_address_line_2/,
  "self-billing generation should pass supplier and company address line 2 fields into the PDF",
);
assert.doesNotMatch(
  selfBilling,
  /sales_rate|salesRate/,
  "self-billing generation must not use or expose sales rate",
);

const selfBillingPdf = read("src/lib/self-billing/pdf.ts");
for (const section of [
  "SELF-BILLING INVOICE",
  "FROM / SUPPLIER",
  "INVOICE TO / CUSTOMER",
  "Project",
  "Consultant / contractor",
  "Description",
  "Quantity",
  "TOTAL DUE",
  "NOTES",
  "VAT No.",
]) {
  assert.match(
    selfBillingPdf,
    new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `self-billing PDF should contain structured section: ${section}`,
  );
}
assert.match(
  selfBillingPdf,
  /This self-billing invoice was generated by ERP Utilities Consulting Services LTD/,
  "self-billing PDF should include the accounting self-billing note",
);
assert.match(
  selfBillingPdf,
  /hourlyRate/,
  "self-billing PDF should render the contractor hourly rate",
);
assert.match(
  selfBillingPdf,
  /contractorAddressLine1[\s\S]*contractorAddressLine2[\s\S]*companyAddressLine1[\s\S]*companyAddressLine2/,
  "self-billing PDF should render split supplier and customer address lines",
);
assert.match(
  selfBillingPdf,
  /function addressLines[\s\S]*split\(\/\\r\?\\n\/\)[\s\S]*splitLongAddressLine[\s\S]*appendUniqueLine/,
  "self-billing PDF should fall back to legacy address lines, split long single-line addresses and avoid duplicate rows",
);
assert.doesNotMatch(
  selfBillingPdf,
  /sales_rate|salesRate|billing_legal_name|billing_vat_number/,
  "self-billing PDF must not expose client billing fields or sales rate",
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
  "src/app/(portal)/page.tsx",
  "src/app/(portal)/contractors/page.tsx",
  "src/app/(portal)/projects/page.tsx",
  "src/app/(portal)/documents/page.tsx",
  "src/app/(portal)/timesheets/page.tsx",
  "src/app/(portal)/invoices/page.tsx",
  "src/app/(portal)/payments/page.tsx",
  "src/app/(portal)/exports/page.tsx",
  "src/app/(portal)/settings/page.tsx",
  "src/components/layout/side-navigation.tsx",
];

for (const file of visibleCopyFiles) {
  const content = read(file);
  assert.doesNotMatch(
    content,
    /fake development|private .*bucket|MVP|Phase 1|scaffolding|\blater\b|internal users|access controlled|Operational overview|Portal state|Data source|Access model planned|Production boundaries|Operational checks|Manual payment status tracking/,
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

const outgoingMigration = read(
  "supabase/migrations/202606280002_outgoing_client_invoices.sql",
);
const manualOutgoingMigration = read(
  "supabase/migrations/202606280006_manual_outgoing_invoices.sql",
);
const securityHardeningMigration = read(
  "supabase/migrations/202606280007_security_hardening.sql",
);
for (const table of [
  "company_invoice_settings",
  "project_billing_details",
  "outgoing_invoice_sequences",
  "outgoing_invoices",
  "outgoing_invoice_lines",
]) {
  assert.match(
    outgoingMigration,
    new RegExp(`create table public\\.${table}`),
    `outgoing billing migration should create ${table}`,
  );
  assert.match(
    outgoingMigration,
    new RegExp(`alter table public\\.${table} enable row level security`),
    `${table} should have RLS enabled`,
  );
}
assert.match(
  outgoingMigration,
  /company_invoice_settings_admin_all[\s\S]*public\.is_admin\(\)/,
  "company invoice settings should be admin-only",
);
assert.match(
  outgoingMigration,
  /project_billing_details_admin_all[\s\S]*public\.is_admin\(\)/,
  "project billing details should be admin-only",
);
assert.match(
  outgoingMigration,
  /outgoing_invoices_admin_all[\s\S]*public\.is_admin\(\)/,
  "outgoing invoices should be admin-only",
);
assert.match(
  outgoingMigration,
  /check \(due_date = invoice_date \+ 30\)/,
  "database should enforce invoice date plus 30 calendar days",
);
assert.match(
  outgoingMigration,
  /ANVEL-%s-%s[\s\S]*lpad\(next_number::text, 4, '0'\)/,
  "outgoing invoice numbering should use ANVEL-YYYY-0001 format",
);
assert.match(
  outgoingMigration,
  /timesheet_id uuid not null[\s\S]*unique/,
  "one outgoing invoice should be allowed per timesheet",
);
assert.match(
  outgoingMigration,
  /'outgoing-invoices'[\s\S]*public = false|false,[\s\S]*array\['application\/pdf'\]/,
  "outgoing invoice storage should be private and PDF-only",
);
assert.match(
  manualOutgoingMigration,
  /invoice_source text not null default 'timesheet'[\s\S]*period_label text/,
  "manual outgoing migration should add invoice source and optional period label",
);
assert.match(
  manualOutgoingMigration,
  /alter column timesheet_id drop not null[\s\S]*alter column contractor_id drop not null/,
  "manual outgoing invoices should allow nullable timesheet and contractor links",
);
assert.match(
  manualOutgoingMigration,
  /invoice_source = 'manual'[\s\S]*timesheet_id is null[\s\S]*contractor_id is null[\s\S]*project_id is not null[\s\S]*consultant_name/,
  "manual outgoing invoices should be project based and require consultant name",
);
assert.match(
  securityHardeningMigration,
  /create table if not exists public\.contractor_project_commercials[\s\S]*contractor_project_id uuid primary key[\s\S]*sales_rate numeric\(12, 2\)/,
  "security migration should move sales rate into contractor_project_commercials",
);
assert.match(
  securityHardeningMigration,
  /insert into public\.contractor_project_commercials[\s\S]*from public\.contractor_projects[\s\S]*where sales_rate is not null[\s\S]*update public\.contractor_projects[\s\S]*set sales_rate = null/,
  "security migration should backfill and then null old contractor_projects sales rates",
);
assert.match(
  securityHardeningMigration,
  /contractor_project_commercials_admin_all[\s\S]*public\.is_admin\(\)/,
  "contractor project commercials should be admin-only",
);
assert.match(
  securityHardeningMigration,
  /drop policy if exists "contractors_select_allowed"[\s\S]*create policy "contractors_select_allowed"[\s\S]*public\.is_admin\(\)[\s\S]*profile_id = auth\.uid\(\)/,
  "operations should not retain raw contractor row access with bank details",
);

const companySettingsAction = read(
  "src/app/(portal)/settings/company/actions.ts",
);
assert.match(
  companySettingsAction,
  /requireRole\(\["admin"\]\)/,
  "company invoice settings action should require admin",
);
assert.match(
  companySettingsAction,
  /default_payment_terms_days: 30[\s\S]*default_currency: "EUR"/,
  "company invoice settings should fix Phase 1 terms and currency",
);
assert.match(
  companySettingsAction,
  /companyAddressLine1[\s\S]*company_address: combineAddress[\s\S]*company_address_line_1[\s\S]*company_address_line_2/,
  "company settings should save split address lines and the legacy combined address",
);
const companySettingsForm = read(
  "src/components/settings/company-invoice-settings-form.tsx",
);
assert.match(
  companySettingsForm,
  /Company address line 1[\s\S]*Company address line 2/,
  "company settings form should render address line 1 and line 2",
);

const projectBillingAction = read("src/app/(portal)/projects/actions.ts");
assert.match(
  projectBillingAction,
  /billingVatNumber: z\.string\(\)\.trim\(\)\.min\(1, "Billing VAT number is required\."\)/,
  "project billing details should require a VAT number",
);
assert.match(
  projectBillingAction,
  /saveProjectBillingDetailsAction[\s\S]*requireRole\(\["admin"\]\)/,
  "project billing updates should require admin",
);
assert.match(
  projectBillingAction,
  /billingAddressLine1[\s\S]*billing_address: combineAddress[\s\S]*billing_address_line_1[\s\S]*billing_address_line_2/,
  "project billing details should save split address lines and the legacy combined address",
);
assert.match(
  read("src/components/projects/project-billing-details-form.tsx"),
  /Billing address line 1[\s\S]*Billing address line 2/,
  "project billing form should render address line 1 and line 2",
);

const projectQueries = read("src/lib/projects/queries.ts");
assert.doesNotMatch(
  projectQueries,
  /const assignmentColumns = `[\s\S]*sales_rate[\s\S]*`;/,
  "project assignment base query must not select sales_rate from contractor_projects",
);
assert.match(
  projectQueries,
  /from\("contractor_project_commercials"\)[\s\S]*select\("contractor_project_id,sales_rate"\)/,
  "admin assignment views should hydrate sales_rate from contractor_project_commercials",
);
assert.match(
  projectBillingAction,
  /saveAssignmentCommercialRate[\s\S]*from\("contractor_project_commercials"\)[\s\S]*upsert/,
  "assignment create/edit actions should write sales_rate to the admin-only commercial table",
);
assert.doesNotMatch(
  projectBillingAction.match(/from\("contractor_projects"\)[\s\S]*?\.select\("id"\)/)?.[0] ?? "",
  /sales_rate: parsed\.data\.salesRate/,
  "assignment create action must not write sales_rate into contractor_projects",
);
assert.doesNotMatch(
  projectBillingAction.match(/from\("contractor_projects"\)[\s\S]*?\.eq\("id", parsed\.data\.assignmentId\)/)?.[0] ?? "",
  /sales_rate: parsed\.data\.salesRate/,
  "assignment edit action must not write sales_rate into contractor_projects",
);

const outgoingGenerator = read("src/lib/outgoing-invoices/generate.ts");
for (const message of [
  "Complete company invoice settings",
  "Complete project billing details",
  "Add the project billing VAT number",
  "Set the assignment sales rate",
]) {
  assert.match(
    outgoingGenerator,
    new RegExp(message),
    `outgoing generation should block with: ${message}`,
  );
}
assert.match(
  outgoingGenerator,
  /from\("contractor_project_commercials"\)[\s\S]*select\("contractor_project_id,sales_rate"\)/,
  "outgoing invoice generation should load sales rate from admin-only commercial rows",
);
assert.doesNotMatch(
  outgoingGenerator,
  /from\("contractor_projects"\)\.select\("id,start_date,end_date,sales_rate,currency"\)/,
  "outgoing invoice generation must not read sales_rate from contractor-readable assignment rows",
);
assert.match(
  outgoingGenerator,
  /netAmount = roundMoney\(quantity \* context\.salesRate\)/,
  "outgoing net amount should use sales rate",
);
assert.match(
  outgoingGenerator,
  /status: "draft"[\s\S]*company_legal_name[\s\S]*billing_legal_name[\s\S]*consultant_name/,
  "outgoing invoice should store sender, recipient and consultant snapshots",
);
assert.match(
  outgoingGenerator,
  /invoice_source: "timesheet"[\s\S]*period_label: null[\s\S]*timesheet_id: timesheet\.id[\s\S]*contractor_id: timesheet\.contractor_id/,
  "timesheet-based outgoing generation should keep explicit timesheet source links",
);
assert.match(
  outgoingGenerator,
  /eq\("timesheet_id", timesheet\.id\)[\s\S]*alreadyGenerated: true/,
  "outgoing generation should reuse an existing timesheet invoice",
);
assert.match(
  outgoingGenerator,
  /eq\("timesheet_id", timesheet\.id\)[\s\S]*neq\("status", "cancelled"\)/,
  "outgoing generation should ignore cancelled historical invoices",
);
assert.match(
  outgoingGenerator,
  /company_address_line_1:[\s\S]*context\.settings\.company_address_line_1 \?\? context\.settings\.company_address[\s\S]*company_address_line_2: context\.settings\.company_address_line_2[\s\S]*billing_address_line_1:[\s\S]*context\.billing\.billing_address_line_1 \?\? context\.billing\.billing_address[\s\S]*billing_address_line_2: context\.billing\.billing_address_line_2/,
  "outgoing generation should snapshot company and billing address line 2 fields",
);

function addThirtyCalendarDays(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}
assert.equal(
  addThirtyCalendarDays("2026-01-31"),
  "2026-03-02",
  "due date should be exactly 30 calendar days after invoice date",
);

const outgoingPdf = read("src/lib/outgoing-invoices/pdf.ts");
for (const section of [
  "INVOICE",
  "FROM",
  "INVOICE TO",
  "Project",
  "Consultant",
  "Description",
  "Quantity",
  "TOTAL DUE",
  "BANK DETAILS",
  "VAT No.",
]) {
  assert.match(
    outgoingPdf,
    new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `outgoing PDF should contain structured section: ${section}`,
  );
}
assert.match(
  outgoingPdf,
  /invoice\.consultant_name/,
  "outgoing PDF should include consultant name",
);
assert.match(
  outgoingPdf,
  /company_address_line_1[\s\S]*company_address_line_2[\s\S]*billing_address_line_1[\s\S]*billing_address_line_2/,
  "outgoing PDF should render split company and billing address lines",
);
assert.match(
  outgoingPdf,
  /function addressLines[\s\S]*split\(\/\\r\?\\n\/\)[\s\S]*splitLongAddressLine[\s\S]*appendUniqueLine/,
  "outgoing PDF should fall back to legacy address lines, split long single-line addresses and avoid duplicate rows",
);
assert.match(
  outgoingPdf,
  /renderLines\(companyAddressLines, 55, 677\)[\s\S]*renderLines\(billingAddressLines, 320, 677\)/,
  "outgoing PDF should render company and billing address line 2 blocks without fixed blank rows",
);
assert.doesNotMatch(
  outgoingPdf,
  /const line = invoice\.lines\[0\]/,
  "outgoing PDF must not render only the first invoice line",
);
assert.match(
  outgoingPdf,
  /chunkInvoiceLines[\s\S]*renderLineTable[\s\S]*invoiceLines\.reduce/,
  "outgoing PDF should render all invoice lines and total from line net amounts",
);

const outgoingActions = read(
  "src/app/(portal)/outgoing-invoices/actions.ts",
);
assert.match(
  outgoingActions,
  /DEFAULT_MANUAL_CONSULTANT_NAME = "Andres Velasco"/,
  "manual outgoing invoices should default consultant name to Andres Velasco",
);
assert.match(
  outgoingActions,
  /createManualOutgoingInvoiceAction[\s\S]*requireRole\(\["admin"\]\)[\s\S]*loadManualInvoiceContext/,
  "manual outgoing invoice creation should be admin-only and load project context",
);
assert.match(
  outgoingActions,
  /Select an active in-force project/,
  "manual outgoing invoice creation should require an active in-force project",
);
assert.match(
  outgoingActions,
  /Project billing details are incomplete\./,
  "manual outgoing invoice creation should block incomplete project billing details clearly",
);
assert.match(
  outgoingActions,
  /createManualOutgoingInvoiceAction[\s\S]*next_outgoing_invoice_number[\s\S]*invoice_source: "manual"[\s\S]*timesheet_id: null[\s\S]*project_id: context\.project\.id[\s\S]*contractor_id: null/,
  "manual outgoing invoices should use the shared number sequence and store manual source links",
);
assert.match(
  outgoingActions,
  /billing_legal_name: context\.billing\.billing_legal_name[\s\S]*billing_email: context\.billing\.billing_email[\s\S]*billing_cc_emails: context\.billing\.billing_cc_emails[\s\S]*billing_address_line_1[\s\S]*billing_address_line_2[\s\S]*billing_country: context\.billing\.billing_country[\s\S]*billing_vat_number: context\.billing\.billing_vat_number[\s\S]*po_reference: context\.billing\.po_reference/,
  "manual outgoing invoices should snapshot selected project billing details",
);
assert.match(
  outgoingActions,
  /manualInvoiceLineSchema[\s\S]*description[\s\S]*quantity[\s\S]*gt\(0[\s\S]*unitLabel[\s\S]*unitRate[\s\S]*nonnegative/,
  "manual outgoing invoice lines should validate description, positive quantity, unit and non-negative rate",
);
assert.match(
  outgoingActions,
  /manualInvoiceLinesSchema[\s\S]*min\(1[\s\S]*Total net amount must be greater than 0/,
  "manual outgoing invoice actions should require at least one positive-value line",
);
assert.match(
  outgoingActions,
  /calculateManualInvoiceTotals[\s\S]*quantity = roundMoney[\s\S]*unitLabel[\s\S]*"mixed"[\s\S]*salesRate[\s\S]*netAmount \/ quantity/,
  "manual outgoing invoice header totals should summarize all submitted line items",
);
assert.match(
  outgoingActions,
  /createManualOutgoingInvoiceAction[\s\S]*linesJson: formData\.get\("linesJson"\)[\s\S]*totals\.invoiceLines\.map[\s\S]*sort_order: line\.sortOrder/,
  "manual outgoing invoice creation should insert one outgoing_invoice_lines row per concept",
);
assert.match(
  outgoingActions,
  /updateManualOutgoingInvoiceDraftAction[\s\S]*linesJson: formData\.get\("linesJson"\)[\s\S]*invoice\.invoice_source !== "manual"[\s\S]*invoice\.status !== "draft"[\s\S]*delete\(\)[\s\S]*totals\.invoiceLines\.map[\s\S]*uploadOutgoingInvoicePdf/,
  "manual outgoing invoice drafts should replace multiple line items and regenerate the PDF while draft only",
);
assert.match(
  outgoingActions,
  /updateOutgoingInvoiceNumberAction[\s\S]*Only draft invoice numbers can be edited/,
  "admin should be able to edit outgoing invoice numbers only while draft",
);
assert.match(
  outgoingActions,
  /parseSequenceInvoiceNumber[\s\S]*ANVEL-\$\{fallbackYear\}-\$\{String\(sequenceNumber\)\.padStart\(4, "0"\)\}/,
  "plain manual invoice numbers should normalize to ANVEL-YYYY-0001 format",
);
assert.match(
  outgoingActions,
  /sync_outgoing_invoice_sequence/,
  "manual outgoing invoice number edits should sync the generated sequence upward",
);
assert.match(
  outgoingActions,
  /outgoing_invoice_number_updated/,
  "manual outgoing invoice number edits should be audited",
);
assert.match(
  outgoingActions,
  /createReplacementOutgoingInvoiceDraftAction[\s\S]*replaces_invoice_id[\s\S]*replaced_by_invoice_id/,
  "cancelled outgoing invoices should support replacement draft creation",
);
assert.match(
  outgoingActions,
  /company_address_line_1: original\.company_address_line_1[\s\S]*company_address_line_2: original\.company_address_line_2[\s\S]*billing_address_line_1: original\.billing_address_line_1[\s\S]*billing_address_line_2: original\.billing_address_line_2/,
  "replacement outgoing invoices should preserve company and billing address line 2 snapshots",
);
assert.match(
  outgoingActions,
  /cancellationRequiresEmail[\s\S]*buildOutgoingInvoiceCancellationEmail[\s\S]*billing_cc_emails/,
  "sent outgoing invoice cancellation should email billing recipient and CC",
);
assert.match(
  outgoingActions,
  /buildOutgoingInvoiceEmail[\s\S]*consultantName: invoice\.consultant_name/,
  "outgoing invoice email should include consultant name",
);
assert.match(
  outgoingActions,
  /buildOutgoingInvoiceEmail[\s\S]*monthLabel: outgoingInvoicePeriodLabel\(invoice\)[\s\S]*to: invoice\.billing_email[\s\S]*cc: invoice\.billing_cc_emails/,
  "manual outgoing invoice email should reuse the client invoice template and project billing recipients",
);
const outgoingEmailTemplate = portalEmail.slice(
  portalEmail.indexOf("export function buildOutgoingInvoiceEmail"),
  portalEmail.indexOf("export function buildOutgoingInvoiceCancellationEmail"),
);
assert.doesNotMatch(
  outgoingEmailTemplate,
  /timesheet|contractor/i,
  "outgoing client invoice email template should not mention timesheets or contractors",
);
assert.match(
  outgoingActions,
  /attachments:[\s\S]*filename: invoice\.pdf_file_name/,
  "outgoing invoice email should attach the PDF",
);
assert.ok(
  outgoingActions.indexOf("await sendPortalEmail") <
    outgoingActions.indexOf('status: "sent"'),
  "sent status should update only after email succeeds",
);
assert.match(
  outgoingActions,
  /markOutgoingInvoicePaidAction[\s\S]*status: "paid"[\s\S]*paid_at[\s\S]*paid_amount/,
  "admin should be able to record manual outgoing invoice payment",
);
assert.match(
  outgoingActions,
  /This cancelled invoice should stay immutable\. Create a replacement draft instead\./,
  "cancelled historical outgoing invoices should remain immutable and use replacement drafts",
);

for (const expected of [
  "invoice_number_manually_edited",
  "invoice_number_edited_at",
  "invoice_number_edited_by",
  "previous_invoice_number",
  "replaces_invoice_id",
  "replaced_by_invoice_id",
  "sync_outgoing_invoice_sequence",
  "Signed NDA",
]) {
  assert.match(
    postTestMigration,
    new RegExp(expected),
    `post-test migration should include ${expected}`,
  );
}
assert.match(
  postTestMigration,
  /set name = 'Signed NDA'[\s\S]*where lower\(name\) = 'nda'/,
  "post-test migration should normalize old NDA rows to Signed NDA",
);

const addressMigration = read(
  "supabase/migrations/202606280005_address_line_split.sql",
);
for (const expected of [
  "company_address_line_1",
  "company_address_line_2",
  "billing_address_line_1",
  "billing_address_line_2",
  "fiscal_address_line_1",
  "fiscal_address_line_2",
]) {
  assert.match(
    addressMigration,
    new RegExp(expected),
    `address split migration should include ${expected}`,
  );
}
assert.match(
  addressMigration,
  /set company_address_line_1 = company_address/,
  "company address line 1 should backfill from the legacy address",
);
assert.match(
  addressMigration,
  /set billing_address_line_1 = billing_address/,
  "project billing address line 1 should backfill from the legacy address",
);
assert.match(
  addressMigration,
  /set fiscal_address_line_1 = fiscal_address/,
  "contractor fiscal address line 1 should backfill from the legacy address",
);

const outgoingRoute = read("src/app/(portal)/outgoing-invoices/page.tsx");
const outgoingDetailRoute = read(
  "src/app/(portal)/outgoing-invoices/[id]/page.tsx",
);
for (const route of [outgoingRoute, outgoingDetailRoute]) {
  assert.match(
    route,
    /requireRole\(\["admin"\]\)/,
    "outgoing invoice routes should require admin",
  );
}
assert.match(
  outgoingRoute,
  /ManualOutgoingInvoiceCreateForm[\s\S]*getManualOutgoingInvoiceProjectOptions/,
  "outgoing invoice list should expose manual invoice creation from active project options",
);
assert.match(
  outgoingDetailRoute,
  /ManualOutgoingInvoiceDraftForm[\s\S]*invoice_source === "manual" \? "Manual project invoice"/,
  "outgoing invoice detail should expose manual draft editing and source display",
);

const outgoingQueries = read("src/lib/outgoing-invoices/queries.ts");
assert.match(
  outgoingQueries,
  /getManualOutgoingInvoiceProjectOptions[\s\S]*eq\("status", "active"\)[\s\S]*isProjectInForce[\s\S]*hasCompleteBillingDetails/,
  "manual invoice project selector should only load active in-force projects and prefer complete billing details",
);

const manualCreateForm = read(
  "src/components/outgoing-invoices/manual-outgoing-invoice-create-form.tsx",
);
assert.match(
  manualCreateForm,
  /Create manual invoice[\s\S]*defaultValue="Andres Velasco"/,
  "manual invoice form should default Andres Velasco",
);
assert.match(
  manualCreateForm,
  /billing incomplete/,
  "manual invoice form should flag incomplete billing projects",
);
assert.match(
  manualCreateForm,
  /ManualOutgoingInvoiceLinesEditor/,
  "manual invoice create form should use the multiple-line editor",
);

const manualDraftForm = read(
  "src/components/outgoing-invoices/manual-outgoing-invoice-draft-form.tsx",
);
assert.match(
  manualDraftForm,
  /invoice\.invoice_source !== "manual"[\s\S]*invoice\.status !== "draft"[\s\S]*Save manual draft/,
  "manual invoice draft form should only render for manual draft invoices",
);
assert.match(
  manualDraftForm,
  /ManualOutgoingInvoiceLinesEditor[\s\S]*invoice\.lines\.map/,
  "manual invoice draft form should edit all existing invoice lines",
);

const manualLinesEditor = read(
  "src/components/outgoing-invoices/manual-outgoing-invoice-lines-editor.tsx",
);
assert.match(
  manualLinesEditor,
  /name="linesJson"[\s\S]*Add line[\s\S]*Remove line/,
  "manual invoice line editor should submit line JSON and expose add/remove controls",
);
assert.match(
  manualLinesEditor,
  /disabled=\{lines\.length === 1\}/,
  "manual invoice line editor should not allow removing the last line",
);

const outgoingFiles = [
  outgoingMigration,
  manualOutgoingMigration,
  companySettingsAction,
  read("src/components/settings/company-invoice-settings-form.tsx"),
  projectBillingAction,
  read("src/components/projects/project-billing-details-form.tsx"),
  outgoingGenerator,
  outgoingPdf,
  outgoingActions,
  outgoingRoute,
  outgoingDetailRoute,
  outgoingQueries,
  manualCreateForm,
  manualDraftForm,
].join("\n");
assert.doesNotMatch(
  outgoingFiles,
  /tax[_ ]number/i,
  "outgoing billing must not create or render a tax number",
);
assert.match(
  read("src/app/(portal)/timesheets/actions.ts"),
  /generateSelfBillingInvoiceForTimesheet[\s\S]*generateOutgoingInvoiceForTimesheet/,
  "timesheet approval should preserve self-billing and create an outgoing draft",
);
assert.match(
  read("src/constants/navigation.ts"),
  /label: "Outgoing Invoices"[\s\S]*allowedRoles: \["admin"\]/,
  "Outgoing Invoices navigation should be admin-only",
);

const onboardingMigration = read(
  "supabase/migrations/202606290001_contractor_onboarding_documents.sql",
);
const onboardingActions = read("src/app/(portal)/onboarding/actions.ts");
const onboardingPage = read("src/app/(portal)/onboarding/page.tsx");
const onboardingDetailsForm = read(
  "src/components/onboarding/onboarding-details-request-form.tsx",
);
const onboardingDocumentsForm = read(
  "src/components/onboarding/onboarding-documents-form.tsx",
);
const onboardingPdf = read("src/lib/onboarding/pdf.ts");
const onboardingSignature = read("src/lib/onboarding/signature.ts");
const onboardingEmailTemplates = read("src/lib/email/portal-email.ts");

assert.match(
  onboardingMigration,
  /contractor_onboarding_documents[\s\S]*enable row level security[\s\S]*public\.is_admin\(\)/,
  "onboarding document archive should be an admin-only RLS table",
);
assert.match(
  onboardingMigration,
  /contractor-onboarding-documents[\s\S]*public = false[\s\S]*array\['application\/pdf'\]/,
  "onboarding PDFs should use a private PDF-only storage bucket",
);
assert.match(
  onboardingPage,
  /requireRole\(\["admin"\]\)/,
  "onboarding page should require admin access",
);
assert.match(
  read("src/constants/navigation.ts"),
  /label: "Onboarding"[\s\S]*href: "\/onboarding"[\s\S]*allowedRoles: \["admin"\]/,
  "Onboarding navigation should be admin-only",
);
assert.match(
  onboardingActions,
  /sendOnboardingDetailsRequestAction[\s\S]*onboarding_details_request_sent/,
  "details request action should audit onboarding details emails",
);
assert.doesNotMatch(
  onboardingActions.match(/const detailsRequestSchema[\s\S]*?\}\);/)?.[0] ?? "",
  /contractorId/,
  "onboarding details request schema should not require contractorId",
);
assert.match(
  onboardingActions.match(/const onboardingDocumentsSchema[\s\S]*?\}\);/)?.[0] ?? "",
  /contractorId: optionalText/,
  "onboarding documents schema should treat contractorId as optional",
);
assert.match(
  onboardingActions.match(/const onboardingDocumentsSchema[\s\S]*?\}\);/)?.[0] ?? "",
  /projectClientLabel: requiredText/,
  "onboarding documents schema should require projectClientLabel",
);
assert.match(
  onboardingActions,
  /sendOnboardingDocumentsEmailAction[\s\S]*generateOnboardingDocuments[\s\S]*attachments:[\s\S]*onboarding_documents_email_sent/,
  "documents action should generate PDFs, attach them to email and audit the send",
);
assert.match(
  onboardingActions,
  /generationErrorMessage[\s\S]*Could not generate the onboarding PDFs: \$\{message\}/,
  "PDF generation errors should return the underlying safe error message to admins",
);
for (const actionName of [
  "sendOnboardingDetailsRequestAction",
  "sendOnboardingDocumentsEmailAction",
]) {
  const actionBody =
    onboardingActions.match(new RegExp(`export async function ${actionName}[\\\\s\\\\S]*?(?=\\nexport async function|$)`))?.[0] ??
    "";
  assert.doesNotMatch(
    actionBody,
    /ensureContractorEmail/,
    `${actionName} should not enforce contractor email matching`,
  );
}
assert.doesNotMatch(
  onboardingActions,
  /sales_rate|project_billing_details|contractor_projects/,
  "onboarding document generation must not auto-pull assignment billing data",
);
assert.match(
  onboardingActions,
  /entity_type: "onboarding"[\s\S]*entity_id: null[\s\S]*contractor_name[\s\S]*internal_contractor_reference/,
  "details request audit should allow free-text sends without linked contractor ids",
);
assert.match(
  onboardingActions,
  /contractor_id: parsed\.data\.contractorId[\s\S]*recipient_display_name[\s\S]*internal_contractor_reference[\s\S]*file_size_bytes/,
  "onboarding archive rows should support null contractor_id and include free-text metadata",
);
assert.match(
  onboardingActions,
  /metadata:[\s\S]*project_client_label: parsed\.data\.projectClientLabel[\s\S]*metadata:[\s\S]*project_client_label: parsed\.data\.projectClientLabel/,
  "onboarding archive and audit metadata should include project_client_label",
);
assert.doesNotMatch(
  onboardingDocumentsForm,
  /projectId|assignmentId|Project selector|Assignment selector/,
  "onboarding document form should remain a manual form without project or assignment selectors",
);
assert.match(
  onboardingDocumentsForm,
  /name="projectClientLabel"[\s\S]*Project \/ client label used in clauses/,
  "onboarding document form should include the project/client label used in clauses",
);
for (const formSource of [onboardingDetailsForm, onboardingDocumentsForm]) {
  assert.doesNotMatch(
    formSource,
    /name="contractorId"|Select contractor|selectedContractor|required[\s\S]*contractorId/,
    "onboarding forms should not render a required contractor selector",
  );
  assert.match(
    formSource,
    /name="recipientEmail"[\s\S]*className=\{fieldClassName\(\)\}/,
    "onboarding forms should use editable free-text recipient emails",
  );
}
assert.doesNotMatch(
  onboardingPage,
  /getContractorsForStaff|bank_account_holder|iban|swift_bic|fiscal_address|vat_number|tax_number/,
  "onboarding page should not load contractors or pass bank, tax or address fields into the manual document form",
);
for (const expected of [
  "Freelance Consultant Framework Agreement",
  "Assignment Schedule",
  "NDA and Data Protection Undertaking",
  "Name: Andres Velasco Fernandez",
  "Title: Director",
  "Signature: _______________________",
]) {
  assert.match(
    onboardingPdf,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `onboarding PDF generator should include ${expected}`,
  );
}
assert.match(
  onboardingPdf,
  /forbiddenGeneratedTokens[\s\S]*XXXXX[\s\S]*XX\.XX[\s\S]*undefined[\s\S]*null[\s\S]*Name client/,
  "onboarding PDF generation should reject raw placeholder tokens",
);
assert.doesNotMatch(
  onboardingPdf,
  /CSO Wesel/,
  "onboarding PDF source should not hardcode CSO Wesel",
);
assert.match(
  onboardingPdf,
  /input\.projectClientLabel/,
  "onboarding PDF clauses should use the manually entered project/client label",
);
assert.match(
  onboardingPdf,
  /Consultant address: \$\{input\.consultantAddress\}/,
  "framework agreement should label the consultant address",
);
assert.match(
  onboardingPdf,
  /Consultant: \$\{input\.consultantLegalName\}/,
  "NDA should label the consultant field",
);
assert.match(
  onboardingPdf,
  /Project \/ client reference: \$\{input\.clientProjectReference\}/,
  "NDA should label the project/client reference field",
);
assert.match(
  onboardingPdf,
  /Generated onboarding document still contains forbidden token: \$\{found\}/,
  "onboarding PDF generation should report the exact forbidden token",
);
assert.doesNotMatch(
  onboardingPdf.match(/const forbiddenGeneratedTokens = \[[\s\S]*?\];/)?.[0] ?? "",
  /placeholder/,
  "the generic word placeholder should not be a forbidden PDF token",
);
for (const expected of [
  "buildOnboardingDetailsRequestEmail",
  "Contract details required for onboarding",
  "Passport or ID number",
  "Bank account holder",
]) {
  assert.match(
    onboardingEmailTemplates,
    new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `onboarding details request email should include ${expected}`,
  );
}
assert.match(
  onboardingEmailTemplates,
  /buildOnboardingDocumentsEmail[\s\S]*Onboarding documents for review and signature[\s\S]*complete only the missing consultant date\/signature fields/,
  "onboarding documents email should ask for review, consultant date and signature only",
);

const pdfRuntimeTempDir = mkdtempSync(join(tmpdir(), "anvel-onboarding-pdf-"));
try {
  const pdfRuntimeSource = onboardingPdf
    .replace(
      'import { anvelSignaturePngBase64 } from "./signature";',
      'import { anvelSignaturePngBase64 } from "./signature.mts";',
    )
    .replace(
      /import type \{[\s\S]*?\} from "\.\/types";/,
      "type GeneratedOnboardingDocument = any;\ntype OnboardingDocumentFormData = any;",
    );
  writeFileSync(join(pdfRuntimeTempDir, "pdf-under-test.mts"), pdfRuntimeSource);
  writeFileSync(join(pdfRuntimeTempDir, "signature.mts"), onboardingSignature);
  writeFileSync(
    join(pdfRuntimeTempDir, "run.mjs"),
    `
      import assert from "node:assert/strict";
      import { generateOnboardingDocuments } from "./pdf-under-test.mts";

      const validInput = {
        contractorId: null,
        recipientEmail: "consultant@example.com",
        recipientDisplayName: "Example Consultant",
        consultantLegalName: "Example Consultant Ltd",
        consultantAddress: "1 Example Street\\nNicosia, Cyprus",
        consultantTaxVatNumber: "CY12345678X",
        consultantTitleStatus: "Freelance Consultant",
        effectiveDate: "2026-06-30",
        documentDate: "2026-06-30",
        clientProjectReference: "HERON SAP Support",
        projectClientLabel: "HERON",
        roleAssignmentTitle: "SAP Consultant",
        startDate: "2026-07-01",
        expectedEndDate: "2026-12-31",
        initialDuration: "6 months",
        workLocation: "Remote",
        expectedWorkload: "Up to 40 hours per week",
        workingTimeZone: "Europe/Nicosia / CET project hours as required",
        specificResponsibilities: "SAP consulting and support services.",
        agreedRateAmount: "85.00",
        currency: "EUR",
        rateUnit: "hour",
        paymentTerm: "30 calendar days",
        timesheetSubmissionInstructions: "Submit timesheets through the approved client process.",
        specialConditions: "N/A",
        bankAccountHolder: "Example Consultant Ltd",
        ibanOrAccountNumber: "CY17002001280000001200527600",
        swiftBic: "N/A",
        bankName: "Example Bank",
        bankCountryAddress: "Cyprus",
        additionalBankDetails: null,
      };

      const documents = generateOnboardingDocuments(validInput);
      assert.equal(documents.length, 3, "valid manual data should generate three onboarding PDFs");
      const generatedText = documents
        .map((document) => Buffer.from(document.pdf).toString("latin1"))
        .join("\\n");
      assert.match(
        generatedText,
        /HERON/,
        "generated onboarding PDFs should contain the manually entered project/client label",
      );
      assert.doesNotMatch(
        generatedText,
        /CSO Wesel/,
        "generated onboarding PDFs should not contain CSO Wesel unless manually entered",
      );
      assert.match(
        generatedText,
        /Consultant address:/,
        "framework agreement PDF should label the consultant address",
      );
      assert.match(
        generatedText,
        /Consultant:/,
        "NDA PDF should label the consultant field",
      );
      assert.match(
        generatedText,
        /Project \\/ client reference:/,
        "NDA PDF should label the project/client reference field",
      );
      for (const document of documents) {
        assert.equal(
          Buffer.from(document.pdf).subarray(0, 8).toString("utf8"),
          "%PDF-1.4",
          "generated onboarding file should be a PDF",
        );
      }

      assert.throws(
        () => generateOnboardingDocuments({ ...validInput, clientProjectReference: "XXXXX" }),
        /forbidden token: XXXXX/,
        "real placeholder values should be rejected with the token in the error",
      );

      assert.doesNotThrow(
        () => generateOnboardingDocuments({
          ...validInput,
          specialConditions: "Use this as placeholder wording during internal review.",
        }),
        "ordinary text containing the word placeholder should not be rejected",
      );
    `,
  );
  execFileSync(
    process.execPath,
    ["--experimental-strip-types", join(pdfRuntimeTempDir, "run.mjs")],
    { stdio: "pipe" },
  );
} finally {
  rmSync(pdfRuntimeTempDir, { recursive: true, force: true });
}

console.log("Business regression checks passed.");
