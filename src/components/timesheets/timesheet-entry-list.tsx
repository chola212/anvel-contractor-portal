import { deleteTimesheetEntryAction } from "@/app/(portal)/timesheets/actions";
import { formatDate, formatHours } from "@/lib/timesheets/format";
import type { TimesheetEntryRecord } from "@/lib/timesheets/types";

type TimesheetEntryListProps = {
  entries: TimesheetEntryRecord[];
  timesheetId: string;
  editable: boolean;
};

export function TimesheetEntryList({
  entries,
  timesheetId,
  editable,
}: TimesheetEntryListProps) {
  if (entries.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No daily entries found
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          A timesheet only needs rows for days actually worked. Empty days are
          intentionally not recorded.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Daily entries
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Required data is date and hours. Notes are optional and should stay
          brief.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Work date
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Hours
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Note
              </th>
              {editable ? (
                <th scope="col" className="px-5 py-3 font-medium">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-5 py-4 align-top font-medium text-neutral-950">
                  {formatDate(entry.work_date)}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {formatHours(entry.hours)}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {entry.note ?? "No note"}
                </td>
                {editable ? (
                  <td className="px-5 py-4 align-top">
                    <form action={deleteTimesheetEntryAction}>
                      <input
                        type="hidden"
                        name="timesheetId"
                        value={timesheetId}
                      />
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
