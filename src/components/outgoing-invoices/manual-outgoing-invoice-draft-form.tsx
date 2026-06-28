"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  updateManualOutgoingInvoiceDraftAction,
  type OutgoingInvoiceActionState,
} from "@/app/(portal)/outgoing-invoices/actions";
import type { OutgoingInvoiceDetail } from "@/lib/outgoing-invoices/types";

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
  const line = invoice.lines[0];

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
        Edit the consultant, concept, quantity, rate and notes before sending.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
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
        <div>
          <label htmlFor="manual-edit-quantity" className="block text-sm font-medium text-neutral-800">Quantity</label>
          <input
            id="manual-edit-quantity"
            name="quantity"
            type="number"
            min="0"
            step="0.01"
            defaultValue={Number(invoice.quantity).toFixed(2)}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.quantity} />
        </div>
        <div>
          <label htmlFor="manual-edit-unit" className="block text-sm font-medium text-neutral-800">Unit</label>
          <input
            id="manual-edit-unit"
            name="unitLabel"
            defaultValue={invoice.unit_label}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.unitLabel} />
        </div>
        <div>
          <label htmlFor="manual-edit-rate" className="block text-sm font-medium text-neutral-800">Rate</label>
          <input
            id="manual-edit-rate"
            name="unitRate"
            type="number"
            min="0"
            step="0.01"
            defaultValue={Number(invoice.sales_rate).toFixed(2)}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.unitRate} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="manual-edit-description" className="block text-sm font-medium text-neutral-800">Description / concept</label>
          <textarea
            id="manual-edit-description"
            name="description"
            rows={3}
            defaultValue={line?.description ?? ""}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <FieldError errors={state.fieldErrors.description} />
        </div>
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
