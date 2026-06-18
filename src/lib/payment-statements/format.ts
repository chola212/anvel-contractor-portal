import type { VatTreatment } from "@/lib/contractors/types";

export const vatTreatmentLabels: Record<VatTreatment, string> = {
  eu_reverse_charge: "EU supplier with valid VAT number - reverse charge",
  cyprus_vat_19: "Cyprus supplier - Cyprus VAT 19%",
  non_eu_accountant_review: "Non-EU supplier - accountant review",
  eu_no_vat_accountant_review:
    "EU supplier without VAT number - accountant review required",
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

export function formatHours(value: number | string | null | undefined) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "0.00 h";
  }

  return `${numericValue.toFixed(2)} h`;
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
