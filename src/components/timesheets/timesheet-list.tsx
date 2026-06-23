import Link from "next/link";

import {
  formatDateTime,
  formatHours,
  formatTimesheetMonth,
} from "@/lib/timesheets/format";
import type { TimesheetSummary } from "@/lib/timesheets/types";

import { TimesheetStatusBadge } from "./timesheet-status-badge";

type TimesheetListProps = {
  timesheets: TimesheetSummary[];
  mode: "staff" | "contractor";
};

export function TimesheetList({ timesheets, mode }: TimesheetListProps) {
  if (timesheets.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No timesheets found
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Monthly timesheets will appear here after fake development records are
          created. Do not use real contractor data in development or staging.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Monthly timesheets
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Monthly overview. Contractors can work on draft or reopened
          timesheets; admin users can manage submitted timesheets from the
          detail page.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              {mode === "staff" ? (
                <th scope="col" className="px-5 py-3 font-medium">
                  Contractor
                </th>
              ) : null}
              <th scope="col" className="px-5 py-3 font-medium">
                Month
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Project
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Entries
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Hours
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Submitted
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {timesheets.map((timesheet) => (
              <tr key={timesheet.id}>
                {mode === "staff" ? (
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/contractors/${timesheet.contractor_id}`}
                      className="font-medium text-teal-800 hover:text-teal-950"
                    >
                      {timesheet.contractor?.legal_name ?? "Unknown contractor"}
                    </Link>
                    <p className="mt-1 text-neutral-600">
                      {timesheet.contractor?.email ?? "No email"}
                    </p>
                  </td>
                ) : null}
                <td className="px-5 py-4 align-top font-medium text-neutral-950">
                  {formatTimesheetMonth(timesheet.year, timesheet.month)}
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">
                    {timesheet.project?.name ?? "Unknown project"}
                  </p>
                  <p className="mt-1 text-neutral-600">
                    {timesheet.project?.client_label ?? "No client label"}
                  </p>
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {timesheet.entry_count}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {formatHours(timesheet.total_hours)}
                </td>
                <td className="px-5 py-4 align-top">
                  <TimesheetStatusBadge status={timesheet.status} />
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {formatDateTime(timesheet.submitted_at)}
                </td>
                <td className="px-5 py-4 align-top">
                  <Link
                    href={`/timesheets/${timesheet.id}`}
                    className="font-medium text-teal-800 hover:text-teal-950"
                  >
                    View timesheet
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
