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

const projectActions = read("src/app/(portal)/projects/actions.ts");
assert.match(
  projectActions,
  /project_closed_for_history/,
  "project removal should close projects with business history",
);

const contractorActions = read("src/app/(portal)/contractors/actions.ts");
assert.match(
  contractorActions,
  /inviteUserByEmail|generateLink/,
  "contractor onboarding should use invite-only auth",
);
assert.match(
  contractorActions,
  /contractor_offboarded/,
  "contractor offboarding should be audited",
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
    /Supabase|fake development|private .*bucket|MVP|later/,
    `${file} should not contain production-facing scaffolding copy`,
  );
}

console.log("Business regression checks passed.");
