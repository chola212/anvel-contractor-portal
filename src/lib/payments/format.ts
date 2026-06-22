import type { PaymentStatus } from "./types";

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
  on_hold: "On hold",
};
