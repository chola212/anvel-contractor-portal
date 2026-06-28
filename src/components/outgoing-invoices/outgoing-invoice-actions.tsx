"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  cancelOutgoingInvoiceAction,
  markOutgoingInvoicePaidAction,
  regenerateOutgoingInvoicePdfAction,
  reopenOutgoingInvoiceAction,
  sendOutgoingInvoiceAction,
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
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (
      [pdfState, sendState, paidState, cancelState, reopenState].some(
        (state) => state.status === "success",
      )
    ) {
      router.refresh();
    }
  }, [cancelState, paidState, pdfState, reopenState, router, sendState]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {invoice.status === "draft" ? (
        <>
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
          <button disabled={cancelPending} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800">{cancelPending ? "Saving..." : "Cancel invoice"}</button>
          <Message state={cancelState} />
        </form>
      ) : null}
      {invoice.status === "cancelled" ? (
        <form action={reopenAction} className="rounded-md border border-neutral-200 bg-white p-4">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <button disabled={reopenPending} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium">{reopenPending ? "Saving..." : "Reopen to draft"}</button>
          <Message state={reopenState} />
        </form>
      ) : null}
    </section>
  );
}
