"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  removeProjectAction,
  type ProjectCreateState,
} from "@/app/(portal)/projects/actions";
import type { ProjectRecord } from "@/lib/projects/types";

type ProjectRemoveFormProps = {
  project: ProjectRecord;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-neutral-400"
    >
      {pending ? "Processing..." : "Remove project"}
    </button>
  );
}

export function ProjectRemoveForm({ project }: ProjectRemoveFormProps) {
  const router = useRouter();
  const initialState: ProjectCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(removeProjectAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">
          Project lifecycle
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Remove or close project
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Projects with contractor assignments or timesheets are closed rather
          than deleted so operational history remains available.
        </p>
      </div>

      <form action={formAction} className="mt-5 flex justify-end">
        <input type="hidden" name="projectId" value={project.id} />
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
