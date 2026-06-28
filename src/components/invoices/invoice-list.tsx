import Link from "next/link";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/invoices/format";
import type { ContractorInvoice } from "@/lib/invoices/types";

import { InvoiceReviewForm } from "./invoice-review-form";
import { InvoiceStatusBadge } from "./invoice-status-badge";

type InvoiceListProps = {
  invoices: ContractorInvoice[];
  mode: "staff" | "contractor";
  showFileName: boolean;
  canDownload: boolean;
  canReview: boolean;
};

export function InvoiceList({
  invoices,
  mode,
  showFileName,
  canDownload,
  canReview,
}: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No invoices yet.
        </h2>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Invoice records
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              {mode === "staff" ? (
                <th scope="col" className="px-5 py-3 font-medium">
                  Contractor
                </th>
              ) : null}
              <th scope="col" className="px-5 py-3 font-medium">
                Invoice
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Project
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Amount
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                File
              </th>
              {canReview ? (
                <th scope="col" className="px-5 py-3 font-medium">
                  Admin review
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                {mode === "staff" ? (
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/contractors/${invoice.contractor_id}/invoices`}
                      className="font-medium text-teal-800 hover:text-teal-950"
                    >
                      {invoice.contractor?.legal_name ?? "Unknown contractor"}
                    </Link>
                    <p className="mt-1 text-neutral-600">
                      {invoice.contractor?.email ?? "No email"}
                    </p>
                  </td>
                ) : null}
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">
                    {invoice.invoice_number}
                  </p>
                  <p className="mt-1 text-neutral-600">
                    Invoice date {formatDate(invoice.invoice_date)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Uploaded {formatDateTime(invoice.created_at)}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">
                    {invoice.project?.name ?? "Unknown project"}
                  </p>
                  <p className="mt-1 text-neutral-600">
                    {invoice.project?.client_label ?? "No client label"}
                  </p>
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  <p>{formatCurrency(invoice.gross_amount, invoice.currency)}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Net {formatCurrency(invoice.net_amount, invoice.currency)}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <InvoiceStatusBadge status={invoice.status} />
                  {invoice.review_comment ? (
                    <p className="mt-2 max-w-xs text-xs leading-5 text-neutral-600">
                      {invoice.review_comment}
                    </p>
                  ) : null}
                  {invoice.status === "cancelled" ? (
                    <div className="mt-2 max-w-xs text-xs leading-5 text-red-800">
                      <p className="font-medium">
                        No longer valid. Retained for audit history.
                      </p>
                      {invoice.cancellation_reason ? (
                        <p>{invoice.cancellation_reason}</p>
                      ) : null}
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  <p>{showFileName ? invoice.file_name : "Hidden for this role"}</p>
                  {canDownload ? (
                    <Link
                      href={`/invoices/${invoice.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex font-medium text-teal-800 hover:text-teal-950"
                    >
                      Download PDF
                    </Link>
                  ) : (
                    <p className="mt-1 text-xs text-neutral-500">
                      Download not enabled for this role
                    </p>
                  )}
                </td>
                {canReview ? (
                  <td className="px-5 py-4 align-top">
                    {invoice.status === "cancelled" ? (
                      <p className="text-xs leading-5 text-neutral-600">
                        Cancelled invoices cannot be reviewed or restored.
                      </p>
                    ) : (
                      <InvoiceReviewForm invoice={invoice} />
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
