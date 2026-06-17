import type { ProjectStatus } from "./types";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
};

export function formatDate(value: string | null) {
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
  }).format(date);
}

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
