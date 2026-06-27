"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  uploadContractorInvoiceAction,
  type InvoiceUploadState,
} from "@/app/(portal)/invoices/actions";
import { formatCurrency, formatDateTime } from "@/lib/invoices/format";
import type { InvoiceUploadStatement } from "@/lib/invoices/types";

type InvoiceUploadFormProps = {
  statements: InvoiceUploadStatement[];
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Uploading..." : "Upload invoice"}
    </button>
  );
}

export function InvoiceUploadForm({ statements }: InvoiceUploadFormProps) {
  const router = useRouter();
  const initialState: InvoiceUploadState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    uploadContractorInvoiceAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  if (statements.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No invoice upload available
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Invoice upload becomes available after ANVEL generates a payment
          statement and no invoice has been uploaded for it yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">
          Contractor invoice
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Upload the official invoice PDF
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Upload the invoice PDF. Expected amounts are copied from the selected
          payment statement for review.
        </p>
      </div>

      <form
        action={formAction}
        className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_auto] lg:items-end"
      >
        <div className="space-y-2">
          <label
            htmlFor="paymentStatementId"
            className="block text-sm font-medium text-neutral-800"
          >
            Payment statement
          </label>
          <select
            id="paymentStatementId"
            name="paymentStatementId"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Select statement</option>
            {statements.map((statement) => (
              <option key={statement.id} value={statement.id}>
                {statement.project?.name ?? "Unknown project"} -{" "}
                {formatCurrency(statement.gross_amount, statement.currency)} -{" "}
                {formatDateTime(statement.created_at)}
              </option>
            ))}
          </select>
          {state.fieldErrors.paymentStatementId?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="invoiceNumber"
            className="block text-sm font-medium text-neutral-800"
          >
            Invoice number
          </label>
          <input
            id="invoiceNumber"
            name="invoiceNumber"
            type="text"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.invoiceNumber?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="invoiceDate"
            className="block text-sm font-medium text-neutral-800"
          >
            Invoice date
          </label>
          <input
            id="invoiceDate"
            name="invoiceDate"
            type="date"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.invoiceDate?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="file" className="block text-sm font-medium text-neutral-800">
            PDF file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-800"
          />
          {state.fieldErrors.file?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

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
