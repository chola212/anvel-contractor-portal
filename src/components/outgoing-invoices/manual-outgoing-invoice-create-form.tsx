"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createManualOutgoingInvoiceAction,
  type OutgoingInvoiceActionState,
} from "@/app/(portal)/outgoing-invoices/actions";
import type { ManualOutgoingInvoiceProjectOption } from "@/lib/outgoing-invoices/queries";
import { ManualOutgoingInvoiceLinesEditor } from "./manual-outgoing-invoice-lines-editor";

const initialState: OutgoingInvoiceActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function FieldError({ errors }: { errors: string[] | undefined }) {
  return errors?.map((error) => (
    <p key={error} className="mt-1 text-sm text-red-700">{error}</p>
  )) ?? null;
}

export function ManualOutgoingInvoiceCreateForm({
  projects,
}: {
  projects: ManualOutgoingInvoiceProjectOption[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createManualOutgoingInvoiceAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.invoiceId) {
      router.push(`/outgoing-invoices/${state.invoiceId}`);
    }
  }, [router, state.invoiceId, state.status]);

  return (
    <form action={action} className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Create manual invoice</h2>
        <p className="text-sm text-neutral-600">
          Create a project-based outgoing invoice using the selected project billing snapshot.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div>
          <label htmlFor="manual-project" className="block text-sm font-medium text-neutral-800">Project</label>
          <select
            id="manual-project"
            name="projectId"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select active project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}{project.client_label ? ` - ${project.client_label}` : ""}{project.hasCompleteBillingDetails ? "" : " - billing incomplete"}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors.projectId} />
        </div>
        <div>
          <label htmlFor="manual-consultant" className="block text-sm font-medium text-neutral-800">Consultant</label>
          <input
            id="manual-consultant"
            name="consultantName"
            defaultValue="Andres Velasco"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.consultantName} />
        </div>
        <div>
          <label htmlFor="manual-date" className="block text-sm font-medium text-neutral-800">Invoice date</label>
          <input
            id="manual-date"
            name="invoiceDate"
            type="date"
            defaultValue={todayKey()}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.invoiceDate} />
        </div>
        <div>
          <label htmlFor="manual-period" className="block text-sm font-medium text-neutral-800">Period label</label>
          <input
            id="manual-period"
            name="periodLabel"
            placeholder="Optional"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.periodLabel} />
        </div>
      </div>
      <ManualOutgoingInvoiceLinesEditor errors={state.fieldErrors.linesJson} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="manual-notes" className="block text-sm font-medium text-neutral-800">Invoice notes</label>
          <textarea
            id="manual-notes"
            name="invoiceNotes"
            rows={3}
            placeholder="Optional. Uses project default notes when left empty."
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.invoiceNotes} />
        </div>
      </div>
      <button
        disabled={pending || projects.length === 0}
        className="mt-4 rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white disabled:bg-neutral-400"
      >
        {pending ? "Creating..." : "Create manual invoice"}
      </button>
      {projects.length === 0 ? (
        <p className="mt-2 text-sm text-amber-700">No active in-force projects are available.</p>
      ) : null}
      {state.message ? (
        <p className={`mt-2 text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
