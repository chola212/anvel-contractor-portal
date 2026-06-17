import { documentStatusLabels } from "@/lib/documents/format";
import type { DocumentStatus } from "@/lib/documents/types";

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};

const statusClasses: Record<DocumentStatus, string> = {
  missing: "border-neutral-200 bg-neutral-50 text-neutral-700",
  uploaded: "border-sky-200 bg-sky-50 text-sky-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  expired: "border-amber-200 bg-amber-50 text-amber-800",
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        statusClasses[status],
      ].join(" ")}
    >
      {documentStatusLabels[status]}
    </span>
  );
}
