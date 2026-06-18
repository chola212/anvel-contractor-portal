"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  submitTimesheetAction,
  type TimesheetActionState,
} from "@/app/(portal)/timesheets/actions";

type TimesheetSubmitFormProps = {
  timesheetId: string;
  entryCount: number;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Submitting..." : "Submit for review"}
    </button>
  );
}

export function TimesheetSubmitForm({
  timesheetId,
  entryCount,
}: TimesheetSubmitFormProps) {
  const router = useRouter();
  const initialState: TimesheetActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    submitTimesheetAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            Contractor submission
          </p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-950">
            Submit this monthly timesheet
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            After submission, contractor editing stops until an admin reopens
            the timesheet for correction.
          </p>
        </div>

        <form action={formAction}>
          <input type="hidden" name="timesheetId" value={timesheetId} />
          <SubmitButton disabled={entryCount === 0} />
        </form>
      </div>

      {entryCount === 0 ? (
        <p className="mt-3 text-sm text-amber-800">
          Add at least one daily entry before submitting.
        </p>
      ) : null}

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
