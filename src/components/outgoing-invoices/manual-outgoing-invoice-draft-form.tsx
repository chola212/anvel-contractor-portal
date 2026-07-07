"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  updateManualOutgoingInvoiceDraftAction,
  type OutgoingInvoiceActionState,
} from "@/app/(portal)/outgoing-invoices/actions";
import type { OutgoingInvoiceDetail } from "@/lib/outgoing-invoices/types";
import { ManualOutgoingInvoiceLinesEditor } from "./manual-outgoing-invoice-lines-editor";

const initialState: OutgoingInvoiceActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

function FieldError({ errors }: { errors: string[] | undefined }) {
  return errors?.map((error) => (
    <p key={error} className="mt-1 text-sm text-red-700">{error}</p>
  )) ?? null;
}

export function ManualOutgoingInvoiceDraftForm({
  invoice,
}: {
  invoice: OutgoingInvoiceDetail;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateManualOutgoingInvoiceDraftAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  if (invoice.invoice_source !== "manual" || invoice.status !== "draft") {
    return null;
  }

  return (
    <form action={action} className="rounded-md border border-neutral-200 bg-white p-5">
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <h2 className="font-semibold">Manual draft details</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Edit the consultant, invoice lines and notes before sending.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="manual-edit-consultant" className="block text-sm font-medium text-neutral-800">Consultant</label>
          <input
            id="manual-edit-consultant"
            name="consultantName"
            defaultValue={invoice.consultant_name}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.consultantName} />
        </div>
        <div>
          <label htmlFor="manual-edit-period" className="block text-sm font-medium text-neutral-800">Period label</label>
          <input
            id="manual-edit-period"
            name="periodLabel"
            defaultValue={invoice.period_label ?? ""}
            placeholder="Optional"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.periodLabel} />
        </div>
      </div>
      <ManualOutgoingInvoiceLinesEditor
        initialLines={invoice.lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity).toFixed(2),
          unitLabel: line.unit_label,
          unitRate: Number(line.unit_rate).toFixed(2),
        }))}
        errors={state.fieldErrors.linesJson}
      />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="manual-edit-notes" className="block text-sm font-medium text-neutral-800">Invoice notes</label>
          <textarea
            id="manual-edit-notes"
            name="invoiceNotes"
            rows={3}
            defaultValue={invoice.billing_invoice_notes ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.invoiceNotes} />
        </div>
      </div>
      <button
        disabled={pending}
        className="mt-4 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium"
      >
        {pending ? "Saving..." : "Save manual draft"}
      </button>
      {state.message ? (
        <p className={`mt-2 text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
