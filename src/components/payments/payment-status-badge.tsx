import { paymentStatusLabels } from "@/lib/payments/format";
import type { PaymentStatus } from "@/lib/payments/types";

const statusClasses: Record<PaymentStatus, string> = {
  pending: "border-neutral-200 bg-neutral-50 text-neutral-700",
  approved: "border-teal-200 bg-teal-50 text-teal-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  on_hold: "border-amber-200 bg-amber-50 text-amber-800",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={[
        "inline-flex rounded-md border px-2.5 py-1 text-xs font-medium",
        statusClasses[status],
      ].join(" ")}
    >
      {paymentStatusLabels[status]}
    </span>
  );
}
