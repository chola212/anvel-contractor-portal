import type { TimesheetStatus } from "./types";

export const timesheetStatusLabels: Record<TimesheetStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  reopened: "Reopened",
  locked: "Locked",
};

export function formatTimesheetMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return "Not set";
  }

  const date = new Date(Date.UTC(year, month - 1, 1));

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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

export function toHours(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

export function formatHours(value: number | string | null | undefined) {
  return `${toHours(value).toFixed(2)} h`;
}
