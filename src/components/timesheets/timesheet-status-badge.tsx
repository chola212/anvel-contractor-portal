import { timesheetStatusLabels } from "@/lib/timesheets/format";
import type { TimesheetStatus } from "@/lib/timesheets/types";

type TimesheetStatusBadgeProps = {
  status: TimesheetStatus;
};

const statusClasses: Record<TimesheetStatus, string> = {
  draft: "border-neutral-200 bg-neutral-50 text-neutral-700",
  submitted: "border-sky-200 bg-sky-50 text-sky-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  reopened: "border-amber-200 bg-amber-50 text-amber-800",
  locked: "border-neutral-300 bg-neutral-100 text-neutral-800",
};

export function TimesheetStatusBadge({ status }: TimesheetStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        statusClasses[status],
      ].join(" ")}
    >
      {timesheetStatusLabels[status]}
    </span>
  );
}
