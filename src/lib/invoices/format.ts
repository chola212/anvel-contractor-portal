import type { InvoiceStatus } from "./types";

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  pending_upload: "Pending upload",
  uploaded: "Uploaded",
  checked: "Checked",
  correction_required: "Correction required",
  approved_for_payment: "Approved for payment",
  paid: "Paid",
  on_hold: "On hold",
};

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "EUR",
) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  }).format(numericValue);
}

export function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
