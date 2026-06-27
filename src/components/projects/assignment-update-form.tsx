"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  updateAssignmentStatusAction,
  type ProjectCreateState,
} from "@/app/(portal)/projects/actions";
import type { ProjectAssignment } from "@/lib/projects/types";

type AssignmentUpdateFormProps = {
  assignment: ProjectAssignment;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function FieldError({ errors }: { errors: string[] | undefined }) {
  if (!errors) {
    return null;
  }

  return (
    <>
      {errors.map((error) => (
        <p key={error} className="text-xs text-red-700">
          {error}
        </p>
      ))}
    </>
  );
}

function rateInputValue(value: number | string | null) {
  if (value === null) {
    return "";
  }

  return String(value);
}

export function AssignmentUpdateForm({
  assignment,
}: AssignmentUpdateFormProps) {
  const router = useRouter();
  const initialState: ProjectCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    updateAssignmentStatusAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="min-w-56 space-y-2">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="projectId" value={assignment.project_id} />
      <input type="hidden" name="contractorId" value={assignment.contractor_id} />

      <div>
        <label
          htmlFor={`hourly-rate-${assignment.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Hourly rate EUR
        </label>
        <input
          id={`hourly-rate-${assignment.id}`}
          name="hourlyRate"
          type="number"
          min="0.01"
          max="10000"
          step="0.01"
          required
          defaultValue={rateInputValue(assignment.hourly_rate)}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.hourlyRate} />
      </div>

      <div>
        <label
          htmlFor={`sales-rate-${assignment.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Sales rate EUR
        </label>
        <input
          id={`sales-rate-${assignment.id}`}
          name="salesRate"
          type="number"
          min="0"
          max="10000"
          step="0.01"
          defaultValue={rateInputValue(assignment.sales_rate)}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.salesRate} />
      </div>

      <div>
        <label
          htmlFor={`status-${assignment.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Assignment status
        </label>
        <select
          id={`status-${assignment.id}`}
          name="status"
          defaultValue={assignment.status}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        >
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
        <FieldError errors={state.fieldErrors.status} />
      </div>

      <div>
        <label
          htmlFor={`start-date-${assignment.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Start date
        </label>
        <input
          id={`start-date-${assignment.id}`}
          name="startDate"
          type="date"
          defaultValue={assignment.start_date ?? ""}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.startDate} />
      </div>

      <div>
        <label
          htmlFor={`end-date-${assignment.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          End date
        </label>
        <input
          id={`end-date-${assignment.id}`}
          name="endDate"
          type="date"
          defaultValue={assignment.end_date ?? ""}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.endDate} />
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>

      {state.message ? (
        <p
          role="status"
          className={
            state.status === "success"
              ? "text-xs text-emerald-700"
              : "text-xs text-red-700"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
