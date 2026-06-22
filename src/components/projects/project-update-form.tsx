"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  updateProjectAction,
  type ProjectCreateState,
} from "@/app/(portal)/projects/actions";
import type { ProjectRecord } from "@/lib/projects/types";

type ProjectUpdateFormProps = {
  project: ProjectRecord;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving..." : "Save project"}
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

export function ProjectUpdateForm({ project }: ProjectUpdateFormProps) {
  const router = useRouter();
  const initialState: ProjectCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    updateProjectAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">
          Admin project update
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Edit project details
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Keep client labels generic where possible. Assignment rates stay in
          the assignment section.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5">
        <input type="hidden" name="projectId" value={project.id} />

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={`project-name-${project.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Project name
            </label>
            <input
              id={`project-name-${project.id}`}
              name="name"
              type="text"
              required
              maxLength={120}
              defaultValue={project.name}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.name} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`client-label-${project.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Client label
            </label>
            <input
              id={`client-label-${project.id}`}
              name="clientLabel"
              type="text"
              defaultValue={project.client_label ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.clientLabel} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`project-country-${project.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Country
            </label>
            <input
              id={`project-country-${project.id}`}
              name="country"
              type="text"
              defaultValue={project.country ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.country} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`project-status-${project.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Status
            </label>
            <select
              id={`project-status-${project.id}`}
              name="status"
              defaultValue={project.status}
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
              htmlFor={`project-start-date-${project.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Start date
            </label>
            <input
              id={`project-start-date-${project.id}`}
              name="startDate"
              type="date"
              defaultValue={project.start_date ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.startDate} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`project-end-date-${project.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              End date
            </label>
            <input
              id={`project-end-date-${project.id}`}
              name="endDate"
              type="date"
              defaultValue={project.end_date ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.endDate} />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`project-admin-notes-${project.id}`}
            className="block text-sm font-medium text-neutral-800"
          >
            Admin notes
          </label>
          <textarea
            id={`project-admin-notes-${project.id}`}
            name="adminNotes"
            rows={3}
            defaultValue={project.admin_notes ?? ""}
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
