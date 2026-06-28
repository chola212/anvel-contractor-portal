"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  approveTimesheetAction,
  rejectTimesheetAction,
  reopenTimesheetAction,
  type TimesheetActionState,
} from "@/app/(portal)/timesheets/actions";
import type { TimesheetStatus } from "@/lib/timesheets/types";

type TimesheetReviewFormProps = {
  timesheetId: string;
  status: TimesheetStatus;
};

function ReviewButton({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "approve" | "reject" | "reopen";
}) {
  const { pending } = useFormStatus();
  const classes = {
    approve:
      "bg-teal-800 text-white hover:bg-teal-900 disabled:bg-neutral-400",
    reject:
      "border border-red-300 bg-white text-red-800 hover:bg-red-50 disabled:border-neutral-300 disabled:text-neutral-500",
    reopen:
      "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 disabled:text-neutral-500",
  };

  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        classes[tone],
      ].join(" ")}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function StatusMessage({ state }: { state: TimesheetActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      role="status"
      className={[
        "mt-4 rounded-md border px-3 py-2 text-sm",
        state.status === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800",
      ].join(" ")}
    >
      {state.message}
    </div>
  );
}

export function TimesheetReviewForm({
  timesheetId,
  status,
}: TimesheetReviewFormProps) {
  const router = useRouter();
  const initialState: TimesheetActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [approveState, approveAction] = useActionState(
    approveTimesheetAction,
    initialState,
  );
  const [rejectState, rejectAction] = useActionState(
    rejectTimesheetAction,
    initialState,
  );
  const [reopenState, reopenAction] = useActionState(
    reopenTimesheetAction,
    initialState,
  );

  useEffect(() => {
    if (
      approveState.status === "success" ||
      rejectState.status === "success" ||
      reopenState.status === "success"
    ) {
      router.refresh();
    }
  }, [approveState.status, rejectState.status, reopenState.status, router]);

  if (status !== "submitted" && status !== "approved" && status !== "rejected") {
    return null;
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">Admin review</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Review this timesheet
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Approving locks the submitted hours for the next payment-statement
          phase. Rejection returns the timesheet to the contractor with a
          correction reason.
        </p>
      </div>

      {status === "submitted" ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <form action={approveAction} className="rounded-md border border-neutral-200 p-4">
            <input type="hidden" name="timesheetId" value={timesheetId} />
            <p className="text-sm font-medium text-neutral-950">
              Approve submitted hours
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Use this only after the month and daily entries have been checked.
            </p>
            <div className="mt-4">
              <ReviewButton tone="approve">Approve timesheet</ReviewButton>
            </div>
            <StatusMessage state={approveState} />
          </form>

          <form action={rejectAction} className="rounded-md border border-neutral-200 p-4">
            <input type="hidden" name="timesheetId" value={timesheetId} />
            <label
              htmlFor="rejectionReason"
              className="text-sm font-medium text-neutral-950"
            >
              Correction reason
            </label>
            <textarea
              id="rejectionReason"
              name="rejectionReason"
              rows={4}
              required
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            {rejectState.fieldErrors.rejectionReason?.map((error) => (
              <p key={error} className="mt-2 text-sm text-red-700">
                {error}
              </p>
            ))}
            <div className="mt-4">
              <ReviewButton tone="reject">Reject for correction</ReviewButton>
            </div>
            <StatusMessage state={rejectState} />
          </form>
        </div>
      ) : null}

      {status === "approved" || status === "rejected" ? (
        <form action={reopenAction} className="mt-5 rounded-md border border-neutral-200 p-4">
          <input type="hidden" name="timesheetId" value={timesheetId} />
          <p className="text-sm font-medium text-neutral-950">
            Reopen for contractor correction
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Reopening this timesheet will cancel any related self-billing and
            outgoing client invoices. A corrected invoice will be generated
            after the timesheet is resubmitted and approved again.
          </p>
          <label
            htmlFor="reopenReason"
            className="mt-4 block text-sm font-medium text-neutral-950"
          >
            Reopen reason
          </label>
          <textarea
            id="reopenReason"
            name="reopenReason"
            rows={4}
            required
            minLength={5}
            maxLength={1000}
            aria-describedby="reopen-reason-help"
            className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <p
            id="reopen-reason-help"
            className="mt-2 text-xs leading-5 text-neutral-600"
          >
            Required, 5–1,000 characters. The contractor will receive this
            reason by email and see it in the reopen history.
          </p>
          {reopenState.fieldErrors.reopenReason?.map((error) => (
            <p key={error} className="mt-2 text-sm text-red-700">
              {error}
            </p>
          ))}
          <div className="mt-4">
            <ReviewButton tone="reopen">Reopen timesheet</ReviewButton>
          </div>
          <StatusMessage state={reopenState} />
        </form>
      ) : null}
    </section>
  );
}
