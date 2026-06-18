import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailField } from "@/components/contractors/detail-field";
import { TimesheetEntryList } from "@/components/timesheets/timesheet-entry-list";
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge";
import { requireCurrentProfile } from "@/lib/auth/profile";
import {
  formatDateTime,
  formatHours,
  formatTimesheetMonth,
} from "@/lib/timesheets/format";
import { getTimesheetById } from "@/lib/timesheets/queries";

type TimesheetDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TimesheetDetailPage({
  params,
}: TimesheetDetailPageProps) {
  await requireCurrentProfile();
  const { id } = await params;
  const timesheet = await getTimesheetById(id);

  if (!timesheet) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <Link
          href="/timesheets"
          className="text-sm font-medium text-teal-800 hover:text-teal-950"
        >
          Back to timesheets
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-teal-700">
              {timesheet.project?.name ?? "Unknown project"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
              {formatTimesheetMonth(timesheet.year, timesheet.month)}
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Read-only monthly timesheet detail. Contractors record only days
              actually worked, with no mandatory task description.
            </p>
          </div>
          <TimesheetStatusBadge status={timesheet.status} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Contractor</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {timesheet.contractor?.legal_name ?? "Unknown contractor"}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Project</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {timesheet.project?.client_label ?? "No client label"}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Total hours</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {formatHours(timesheet.total_hours)}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Entries</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {timesheet.entry_count}
          </p>
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Review state
        </h2>
        <dl className="mt-2 grid gap-x-6 md:grid-cols-2">
          <DetailField
            label="Submitted at"
            value={formatDateTime(timesheet.submitted_at)}
          />
          <DetailField
            label="Approved at"
            value={formatDateTime(timesheet.approved_at)}
          />
          <DetailField
            label="Rejected at"
            value={formatDateTime(timesheet.rejected_at)}
          />
          <DetailField
            label="Correction reason"
            value={timesheet.rejection_reason ?? "Not set"}
          />
        </dl>
      </section>

      <TimesheetEntryList entries={timesheet.entries} />
    </div>
  );
}
