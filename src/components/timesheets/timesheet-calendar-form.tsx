"use client";

import { useActionState, useMemo } from "react";
import { useFormStatus } from "react-dom";

import {
  saveTimesheetCalendarAction,
  type TimesheetActionState,
} from "@/app/(portal)/timesheets/actions";
import {
  dateIsWithinAssignment,
  type AssignmentPeriod,
} from "@/lib/timesheets/assignment-periods";
import type { TimesheetEntryRecord } from "@/lib/timesheets/types";

type TimesheetCalendarFormProps = {
  timesheetId: string;
  year: number;
  month: number;
  entries: TimesheetEntryRecord[];
  assignments: AssignmentPeriod[];
  comments: string | null;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving..." : "Save calendar"}
    </button>
  );
}

function getCalendarDays(year: number, month: number) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leadingBlanks = firstDay === 0 ? 6 : firstDay - 1;

  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function TimesheetCalendarForm({
  timesheetId,
  year,
  month,
  entries,
  assignments,
  comments,
}: TimesheetCalendarFormProps) {
  const initialState: TimesheetActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    saveTimesheetCalendarAction,
    initialState,
  );
  const entryMap = useMemo(
    () => new Map(entries.map((entry) => [entry.work_date, entry])),
    [entries],
  );
  const calendarDays = getCalendarDays(year, month);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">Monthly hours</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Edit calendar
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Enter hours on worked days only. Empty days are saved as not worked.
        </p>
      </div>

      <form action={formAction} className="mt-5 space-y-5">
        <input type="hidden" name="timesheetId" value={timesheetId} />
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7 gap-px overflow-hidden rounded-md border border-neutral-200 bg-neutral-200">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase text-neutral-500"
              >
                {label}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-32 bg-neutral-50"
                    aria-hidden="true"
                  />
                );
              }

              const key = dateKey(year, month, day);
              const entry = entryMap.get(key);
              const isEnabled = assignments.some((assignment) =>
                dateIsWithinAssignment(key, assignment),
              );
              const dayOfWeek = new Date(
                Date.UTC(year, month - 1, day),
              ).getUTCDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <div
                  key={key}
                  className={[
                    "min-h-32 p-2",
                    isWeekend ? "bg-neutral-100" : "bg-white",
                    isEnabled ? "" : "bg-neutral-50 text-neutral-400",
                  ].join(" ")}
                  data-weekend={isWeekend ? "true" : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{day}</span>
                    {!isEnabled ? (
                      <span className="text-[11px] font-medium uppercase">
                        Outside assignment
                      </span>
                    ) : null}
                  </div>
                  <label
                    htmlFor={`hours-${key}`}
                    className="mt-3 block text-xs font-medium text-neutral-600"
                  >
                    Hours
                  </label>
                  <input
                    id={`hours-${key}`}
                    name={`hours_${key}`}
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    disabled={!isEnabled}
                    defaultValue={entry ? String(entry.hours) : ""}
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-950 outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-neutral-100 disabled:text-neutral-400"
                  />
                  {state.fieldErrors[`hours_${key}`]?.map((error) => (
                    <p key={error} className="mt-1 text-xs text-red-700">
                      {error}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="comments"
            className="block text-sm font-medium text-neutral-800"
          >
            Comments
          </label>
          <textarea
            id="comments"
            name="comments"
            rows={3}
            maxLength={2000}
            defaultValue={comments ?? ""}
            placeholder="Add any comments for this timesheet if needed."
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.comments?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>

      {state.message ? (
        <div
          role="status"
          className={[
            "mt-5 rounded-md border px-3 py-2 text-sm",
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
        >
          {state.message}
        </div>
      ) : null}
    </section>
  );
}
