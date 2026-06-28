import type { OutgoingInvoiceStatus } from "@/lib/outgoing-invoices/types";

const classes: Record<OutgoingInvoiceStatus, string> = {
  draft: "border-neutral-300 bg-neutral-50 text-neutral-700",
  sent: "border-sky-200 bg-sky-50 text-sky-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  overdue: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
};

export function OutgoingInvoiceStatusBadge({ status }: { status: OutgoingInvoiceStatus }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${classes[status]}`}>{status}</span>;
}
