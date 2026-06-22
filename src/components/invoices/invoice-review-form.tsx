"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  reviewInvoiceAction,
  type InvoiceReviewState,
} from "@/app/(portal)/invoices/actions";
import { invoiceStatusLabels } from "@/lib/invoices/format";
import type { ContractorInvoice } from "@/lib/invoices/types";

type InvoiceReviewFormProps = {
  invoice: ContractorInvoice;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving..." : "Save review"}
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

export function InvoiceReviewForm({ invoice }: InvoiceReviewFormProps) {
  const router = useRouter();
  const initialState: InvoiceReviewState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    reviewInvoiceAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="min-w-72 space-y-3">
      <input type="hidden" name="invoiceId" value={invoice.id} />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor={`invoice-status-${invoice.id}`}>
          Invoice review status
        </label>
        <select
          id={`invoice-status-${invoice.id}`}
          name="status"
          defaultValue={invoice.status}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        >
          <option value="uploaded">{invoiceStatusLabels.uploaded}</option>
          <option value="checked">{invoiceStatusLabels.checked}</option>
          <option value="correction_required">
            {invoiceStatusLabels.correction_required}
          </option>
          <option value="approved_for_payment">
            {invoiceStatusLabels.approved_for_payment}
          </option>
          <option value="on_hold">{invoiceStatusLabels.on_hold}</option>
        </select>
        <SubmitButton />
      </div>
      <FieldError errors={state.fieldErrors.status} />

      <div>
        <label
          htmlFor={`review-comment-${invoice.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Review comment
        </label>
        <textarea
          id={`review-comment-${invoice.id}`}
          name="reviewComment"
          rows={2}
          defaultValue={invoice.review_comment ?? ""}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.reviewComment} />
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
  );
}
