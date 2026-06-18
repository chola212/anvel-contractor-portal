import { invoiceStatusLabels } from "@/lib/invoices/format";
import type { InvoiceStatus } from "@/lib/invoices/types";

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
};

const statusClasses: Record<InvoiceStatus, string> = {
  pending_upload: "border-neutral-200 bg-neutral-50 text-neutral-700",
  uploaded: "border-sky-200 bg-sky-50 text-sky-800",
  checked: "border-emerald-200 bg-emerald-50 text-emerald-800",
  correction_required: "border-amber-200 bg-amber-50 text-amber-800",
  approved_for_payment: "border-teal-200 bg-teal-50 text-teal-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  on_hold: "border-rose-200 bg-rose-50 text-rose-800",
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        statusClasses[status],
      ].join(" ")}
    >
      {invoiceStatusLabels[status]}
    </span>
  );
}
