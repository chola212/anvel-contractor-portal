"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  startTimesheetAction,
  type TimesheetActionState,
} from "@/app/(portal)/timesheets/actions";
import type { ProjectAssignment } from "@/lib/projects/types";

type StartTimesheetFormProps = {
  assignments: ProjectAssignment[];
};

const monthOptions = [
  ["1", "January"],
  ["2", "February"],
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["7", "July"],
  ["8", "August"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Starting..." : "Start timesheet"}
    </button>
  );
}

export function StartTimesheetForm({ assignments }: StartTimesheetFormProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const initialState: TimesheetActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    startTimesheetAction,
    initialState,
  );

  if (assignments.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Timesheet creation unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          No active project assignment is linked to your contractor profile yet.
          A monthly timesheet can only be started for an assigned project.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">
          Contractor timesheet
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Start a monthly timesheet
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Create a draft for one assigned project and month. Add rows only for
          days actually worked.
        </p>
      </div>

      <form
        action={formAction}
        className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.6fr_0.6fr_auto] lg:items-end"
      >
        <div className="space-y-2">
          <label
            htmlFor="projectId"
            className="block text-sm font-medium text-neutral-800"
          >
            Project
          </label>
          <select
            id="projectId"
            name="projectId"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Select project</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.project_id}>
                {assignment.project?.name ?? "Unknown project"}
              </option>
            ))}
          </select>
          {state.fieldErrors.projectId?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="month" className="block text-sm font-medium text-neutral-800">
            Month
          </label>
          <select
            id="month"
            name="month"
            defaultValue={String(today.getMonth() + 1)}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          >
            {monthOptions.map(([value, label]) => (
              <option
                key={value}
                value={value}
                disabled={
                  selectedYear > currentYear ||
                  (selectedYear === currentYear && Number(value) > currentMonth)
                }
              >
                {label}
              </option>
            ))}
          </select>
          {state.fieldErrors.month?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="year" className="block text-sm font-medium text-neutral-800">
            Year
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min="2024"
            max={currentYear}
            defaultValue={currentYear}
            onChange={(event) => setSelectedYear(Number(event.currentTarget.value))}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.year?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <SubmitButton />
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
