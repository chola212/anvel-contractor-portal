"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createProjectAction,
  type ProjectCreateState,
} from "@/app/(portal)/projects/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Creating..." : "Create project"}
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

export function ProjectCreateForm() {
  const initialState: ProjectCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    createProjectAction,
    initialState,
  );

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">Admin project setup</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Create a project record
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Use generic client labels where possible. Project assignment and rate
          setup remain separate controlled steps.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-neutral-800"
            >
              Project name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.name} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="clientLabel"
              className="block text-sm font-medium text-neutral-800"
            >
              Client label
            </label>
            <input
              id="clientLabel"
              name="clientLabel"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.clientLabel} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="country"
              className="block text-sm font-medium text-neutral-800"
            >
              Country
            </label>
            <input
              id="country"
              name="country"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.country} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-neutral-800"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="planned"
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
              htmlFor="startDate"
              className="block text-sm font-medium text-neutral-800"
            >
              Start date
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
              End date
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

        <div className="space-y-2">
          <label
            htmlFor="adminNotes"
            className="block text-sm font-medium text-neutral-800"
          >
            Admin notes
          </label>
          <textarea
            id="adminNotes"
            name="adminNotes"
            rows={3}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <FieldError errors={state.fieldErrors.adminNotes} />
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
