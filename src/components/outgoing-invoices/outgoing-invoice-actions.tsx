"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  cancelOutgoingInvoiceAction,
  createReplacementOutgoingInvoiceDraftAction,
  markOutgoingInvoicePaidAction,
  regenerateOutgoingInvoicePdfAction,
  reopenOutgoingInvoiceAction,
  sendOutgoingInvoiceAction,
  updateOutgoingInvoiceNumberAction,
  type OutgoingInvoiceActionState,
} from "@/app/(portal)/outgoing-invoices/actions";
import type { OutgoingInvoice } from "@/lib/outgoing-invoices/types";

const initialState: OutgoingInvoiceActionState = { status: "idle", message: null, fieldErrors: {} };

function Message({ state }: { state: OutgoingInvoiceActionState }) {
  return state.message ? <p className={`mt-2 text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null;
}

export function OutgoingInvoiceActions({ invoice }: { invoice: OutgoingInvoice }) {
  const router = useRouter();
  const [pdfState, pdfAction, pdfPending] = useActionState(regenerateOutgoingInvoicePdfAction, initialState);
  const [sendState, sendAction, sendPending] = useActionState(sendOutgoingInvoiceAction, initialState);
  const [paidState, paidAction, paidPending] = useActionState(markOutgoingInvoicePaidAction, initialState);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelOutgoingInvoiceAction, initialState);
  const [reopenState, reopenAction, reopenPending] = useActionState(reopenOutgoingInvoiceAction, initialState);
  const [numberState, numberAction, numberPending] = useActionState(updateOutgoingInvoiceNumberAction, initialState);
  const [replacementState, replacementAction, replacementPending] = useActionState(createReplacementOutgoingInvoiceDraftAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (
      [pdfState, sendState, paidState, cancelState, reopenState, numberState, replacementState].some(
        (state) => state.status === "success",
      )
    ) {
      router.refresh();
    }
  }, [cancelState, numberState, paidState, pdfState, reopenState, replacementState, router, sendState]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {invoice.status === "draft" ? (
        <>
          <form action={numberAction} className="rounded-md border border-neutral-200 bg-white p-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <h3 className="font-semibold">Draft invoice number</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Changing this number affects future generated numbering. Entering 33 will be normalised to ANVEL-{invoice.year}-0033.
            </p>
            <input
              name="invoiceNumber"
              defaultValue={invoice.invoice_number}
              required
              className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            {numberState.fieldErrors.invoiceNumber?.map((error) => (
              <p key={error} className="mt-1 text-sm text-red-700">{error}</p>
            ))}
            <button disabled={numberPending} className="mt-3 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium">{numberPending ? "Saving..." : "Save invoice number"}</button>
            <Message state={numberState} />
          </form>
          <form action={pdfAction} className="rounded-md border border-neutral-200 bg-white p-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <h3 className="font-semibold">Draft PDF</h3>
            <button disabled={pdfPending} className="mt-3 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium">{pdfPending ? "Generating..." : "Generate / regenerate PDF"}</button>
            <Message state={pdfState} />
          </form>
          <form action={sendAction} className="rounded-md border border-neutral-200 bg-white p-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <h3 className="font-semibold">Send invoice</h3>
            <p className="mt-1 text-sm text-neutral-600">Email the PDF to {invoice.billing_email}.</p>
            <button disabled={sendPending} className="mt-3 rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white">{sendPending ? "Sending..." : "Send invoice"}</button>
            <Message state={sendState} />
          </form>
        </>
      ) : null}
      {["sent", "overdue"].includes(invoice.status) ? (
        <form action={paidAction} className="rounded-md border border-neutral-200 bg-white p-4 lg:col-span-2">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <h3 className="font-semibold">Mark as paid</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input type="date" name="paidDate" required defaultValue={today} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <input type="number" name="paidAmount" required min="0" step="0.01" defaultValue={Number(invoice.gross_amount).toFixed(2)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <input name="paymentReference" placeholder="Payment reference" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <input name="internalNote" placeholder="Internal note" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <button disabled={paidPending} className="mt-3 rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white">{paidPending ? "Saving..." : "Mark paid"}</button>
          <Message state={paidState} />
        </form>
      ) : null}
      {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
        <form action={cancelAction} className="rounded-md border border-rose-200 bg-white p-4">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <label htmlFor={`cancellationReason-${invoice.id}`} className="block text-sm font-medium text-neutral-800">Cancellation reason</label>
          <textarea
            id={`cancellationReason-${invoice.id}`}
            name="cancellationReason"
            rows={3}
            placeholder="Short reason shown in audit history and cancellation email when required"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button disabled={cancelPending} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800">{cancelPending ? "Saving..." : "Cancel invoice"}</button>
          <Message state={cancelState} />
        </form>
      ) : null}
      {invoice.status === "cancelled" ? (
        <>
          {!invoice.sent_at && !invoice.cancellation_reason ? (
            <form action={reopenAction} className="rounded-md border border-neutral-200 bg-white p-4">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <h3 className="font-semibold">Cancelled draft</h3>
              <button disabled={reopenPending} className="mt-3 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium">{reopenPending ? "Saving..." : "Reopen to draft"}</button>
              <Message state={reopenState} />
            </form>
          ) : null}
          <form action={replacementAction} className="rounded-md border border-neutral-200 bg-white p-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <h3 className="font-semibold">Replacement draft</h3>
            <p className="mt-1 text-sm text-neutral-600">Keep this cancelled invoice immutable and create a new editable draft with a new invoice number.</p>
            <button disabled={replacementPending || Boolean(invoice.replaced_by_invoice_id)} className="mt-3 rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white disabled:bg-neutral-400">
              {invoice.replaced_by_invoice_id ? "Replacement already created" : replacementPending ? "Creating..." : "Create replacement draft"}
            </button>
            <Message state={replacementState} />
          </form>
        </>
      ) : null}
    </section>
  );
}
