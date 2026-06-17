import { contractorStatusLabels } from "@/lib/contractors/format";
import type { ContractorStatus } from "@/lib/contractors/types";

type StatusBadgeProps = {
  status: ContractorStatus;
};

const statusClasses: Record<ContractorStatus, string> = {
  draft: "border-neutral-200 bg-neutral-50 text-neutral-700",
  invited: "border-sky-200 bg-sky-50 text-sky-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  paused: "border-amber-200 bg-amber-50 text-amber-800",
  offboarded: "border-neutral-300 bg-neutral-100 text-neutral-600",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        statusClasses[status],
      ].join(" ")}
    >
      {contractorStatusLabels[status]}
    </span>
  );
}
