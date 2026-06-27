import {
  dateIsWithinAssignment,
  type AssignmentPeriod,
} from "@/lib/timesheets/assignment-periods";

export type EntryForRateSelection = {
  work_date: string;
  hours: number | string;
};

export type AssignmentForRateSelection = Pick<
  AssignmentPeriod,
  "id" | "start_date" | "end_date"
> & {
  hourly_rate: number | string;
  currency: string;
};

export function selectSingleStatementRate(
  entries: EntryForRateSelection[],
  assignments: AssignmentForRateSelection[],
) {
  const matchedRates = new Map<string, { hourly_rate: number; currency: string }>();

  for (const entry of entries) {
    const matchingAssignments = assignments.filter((assignment) =>
      dateIsWithinAssignment(entry.work_date, assignment),
    );

    if (matchingAssignments.length === 0) {
      return {
        ok: false as const,
        message: `No assignment rate covers ${entry.work_date}.`,
      };
    }

    if (matchingAssignments.length > 1) {
      return {
        ok: false as const,
        message: `More than one assignment rate covers ${entry.work_date}.`,
      };
    }

    const assignment = matchingAssignments[0];
    const rateKey = `${Number(assignment.hourly_rate).toFixed(2)}:${assignment.currency}`;
    matchedRates.set(rateKey, {
      hourly_rate: Number(assignment.hourly_rate),
      currency: assignment.currency,
    });
  }

  if (matchedRates.size !== 1) {
    return {
      ok: false as const,
      message:
        "This timesheet uses more than one assignment rate. Split the timesheet or review the assignments before generating a statement.",
    };
  }

  const [rate] = matchedRates.values();

  return {
    ok: true as const,
    hourlyRate: rate.hourly_rate,
    currency: rate.currency,
  };
}
