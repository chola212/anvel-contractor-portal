"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  markInvoicePaidAction,
  updatePaymentStatusAction,
  type PaymentActionState,
} from "@/app/(portal)/payments/actions";
import { formatCurrency } from "@/lib/invoices/format";
import { paymentStatusLabels } from "@/lib/payments/format";
import type { PaymentRow } from "@/lib/payments/types";

type PaymentStatusFormProps = {
  row: PaymentRow;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function MarkPaidButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Marking..." : "Mark as paid"}
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

export function PaymentStatusForm({ row }: PaymentStatusFormProps) {
  const router = useRouter();
  const initialState: PaymentActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    updatePaymentStatusAction,
    initialState,
  );
  const defaultPaidAmount =
    row.payment?.paid_amount?.toString() ?? row.invoice.gross_amount.toString();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="min-w-72 space-y-3">
      <form action={markInvoicePaidAction} className="flex justify-end">
        <input type="hidden" name="invoiceId" value={row.invoice.id} />
        <input type="hidden" name="paidAmount" value={defaultPaidAmount} />
        <MarkPaidButton />
      </form>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="invoiceId" value={row.invoice.id} />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor={`payment-status-${row.invoice.id}`}>
          Payment status
        </label>
        <select
          id={`payment-status-${row.invoice.id}`}
          name="status"
          defaultValue={row.payment?.status ?? "pending"}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        >
          <option value="pending">{paymentStatusLabels.pending}</option>
          <option value="approved">{paymentStatusLabels.approved}</option>
          <option value="paid">{paymentStatusLabels.paid}</option>
          <option value="on_hold">{paymentStatusLabels.on_hold}</option>
        </select>
        <SubmitButton />
      </div>
      <FieldError errors={state.fieldErrors.status} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`payment-date-${row.invoice.id}`}
            className="mb-1 block text-xs font-medium text-neutral-600"
          >
            Payment date
          </label>
          <input
            id={`payment-date-${row.invoice.id}`}
            name="paymentDate"
            type="date"
            defaultValue={row.payment?.payment_date ?? ""}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <FieldError errors={state.fieldErrors.paymentDate} />
        </div>

        <div>
          <label
            htmlFor={`paid-amount-${row.invoice.id}`}
            className="mb-1 block text-xs font-medium text-neutral-600"
          >
            Paid amount
          </label>
          <input
            id={`paid-amount-${row.invoice.id}`}
            name="paidAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultPaidAmount}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Expected {formatCurrency(row.invoice.gross_amount, row.invoice.currency)}
          </p>
          <FieldError errors={state.fieldErrors.paidAmount} />
        </div>
      </div>

      <div>
        <label
          htmlFor={`payment-reference-${row.invoice.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Payment reference
        </label>
        <input
          id={`payment-reference-${row.invoice.id}`}
          name="paymentReference"
          type="text"
          defaultValue={row.payment?.payment_reference ?? ""}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.paymentReference} />
      </div>

      <div>
        <label
          htmlFor={`internal-note-${row.invoice.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Internal note
        </label>
        <textarea
          id={`internal-note-${row.invoice.id}`}
          name="internalNote"
          rows={2}
          defaultValue={row.payment?.internal_note ?? ""}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.internalNote} />
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
    </div>
  );
}
