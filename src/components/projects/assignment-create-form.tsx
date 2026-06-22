"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  createAssignmentAction,
  type ProjectCreateState,
} from "@/app/(portal)/projects/actions";
import type { ContractorRecord } from "@/lib/contractors/types";

type AssignmentCreateFormProps = {
  projectId: string;
  contractors: Pick<
    ContractorRecord,
    "id" | "legal_name" | "email" | "status"
  >[];
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Assigning..." : "Create assignment"}
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
        <p key={error} className="text-sm text-red-700">
          {error}
        </p>
      ))}
    </>
  );
}

export function AssignmentCreateForm({
  projectId,
  contractors,
}: AssignmentCreateFormProps) {
  const router = useRouter();
  const initialState: ProjectCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    createAssignmentAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  if (contractors.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No contractors available
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Create a contractor profile before assigning work to this project.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">
          Admin assignment setup
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Assign a contractor
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Set the contractor rate for this project. Sales rate is admin-only and
          can be left blank.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5">
        <input type="hidden" name="projectId" value={projectId} />

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="contractorId"
              className="block text-sm font-medium text-neutral-800"
            >
              Contractor
            </label>
            <select
              id="contractorId"
              name="contractorId"
              required
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Select contractor</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.legal_name} - {contractor.email} (
                  {contractor.status})
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors.contractorId} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-neutral-800"
            >
              Assignment status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="active"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
            <FieldError errors={state.fieldErrors.status} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="hourlyRate"
              className="block text-sm font-medium text-neutral-800"
            >
              Hourly rate EUR
            </label>
            <input
              id="hourlyRate"
              name="hourlyRate"
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              required
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.hourlyRate} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="salesRate"
              className="block text-sm font-medium text-neutral-800"
            >
              Sales rate EUR
            </label>
            <input
              id="salesRate"
              name="salesRate"
              type="number"
              min="0"
              max="10000"
              step="0.01"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.salesRate} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-neutral-800"
            >
              Assignment start date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.startDate} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-neutral-800"
            >
              Assignment end date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.endDate} />
          </div>
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
