export type AssignmentPeriod = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  hourly_rate?: number | string;
  currency?: string;
};

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getMonthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    daysInMonth: end.getUTCDate(),
  };
}

export function dateIsWithinAssignment(
  workDate: string,
  assignment: Pick<AssignmentPeriod, "start_date" | "end_date">,
) {
  return (
    (!assignment.start_date || workDate >= assignment.start_date) &&
    (!assignment.end_date || workDate <= assignment.end_date)
  );
}

export function monthOverlapsAssignment(
  year: number,
  month: number,
  assignment: Pick<AssignmentPeriod, "start_date" | "end_date">,
) {
  const { startDate, endDate } = getMonthBounds(year, month);

  return (
    (!assignment.start_date || assignment.start_date <= endDate) &&
    (!assignment.end_date || assignment.end_date >= startDate)
  );
}

export function getAssignmentsForDate(
  workDate: string,
  assignments: AssignmentPeriod[],
) {
  return assignments.filter((assignment) =>
    dateIsWithinAssignment(workDate, assignment),
  );
}

export function getSingleAssignmentForDate(
  workDate: string,
  assignments: AssignmentPeriod[],
) {
  const validAssignments = getAssignmentsForDate(workDate, assignments);

  if (validAssignments.length !== 1) {
    return null;
  }

  return validAssignments[0];
}

export function getAssignmentDateRangeForMonth(
  year: number,
  month: number,
  assignments: AssignmentPeriod[],
) {
  const { daysInMonth } = getMonthBounds(year, month);
  const enabledDates = new Set<string>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (
      assignments.some((assignment) =>
        dateIsWithinAssignment(dateKey, assignment),
      )
    ) {
      enabledDates.add(dateKey);
    }
  }

  return enabledDates;
}
