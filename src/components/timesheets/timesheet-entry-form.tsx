"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  addTimesheetEntryAction,
  type TimesheetActionState,
} from "@/app/(portal)/timesheets/actions";

type TimesheetEntryFormProps = {
  timesheetId: string;
  year: number;
  month: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Adding..." : "Add entry"}
    </button>
  );
}

function defaultWorkDate(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function TimesheetEntryForm({
  timesheetId,
  year,
  month,
}: TimesheetEntryFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialState: TimesheetActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    addTimesheetEntryAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">Daily hours</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Add a worked day
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Add only days where work was performed. Detailed task descriptions are
          not required in this portal.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 grid gap-5 lg:grid-cols-[0.7fr_0.5fr_1.4fr_auto] lg:items-end"
      >
        <input type="hidden" name="timesheetId" value={timesheetId} />

        <div className="space-y-2">
          <label
            htmlFor="workDate"
            className="block text-sm font-medium text-neutral-800"
          >
            Work date
          </label>
          <input
            id="workDate"
            name="workDate"
            type="date"
            defaultValue={defaultWorkDate(year, month)}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.workDate?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="hours" className="block text-sm font-medium text-neutral-800">
            Hours
          </label>
          <input
            id="hours"
            name="hours"
            type="number"
            min="0.25"
            max="24"
            step="0.25"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.hours?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="note" className="block text-sm font-medium text-neutral-800">
            Brief note
          </label>
          <input
            id="note"
            name="note"
            type="text"
            maxLength={280}
            placeholder="Optional"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.note?.map((error) => (
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
