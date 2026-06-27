import Link from "next/link";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/invoices/format";
import type { PaymentRow } from "@/lib/payments/types";

import { PaymentStatusBadge } from "./payment-status-badge";
import { PaymentStatusForm } from "./payment-status-form";

type PaymentListProps = {
  rows: PaymentRow[];
  mode: "staff" | "contractor";
  canManage: boolean;
};

export function PaymentList({ rows, mode, canManage }: PaymentListProps) {
  if (rows.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No invoices ready for payment tracking
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Payment records appear after official invoices have been uploaded.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Manual payment status
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Track payment status manually. This does not trigger bank payments or
          issue invoices on behalf of contractors.
        </p>
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
                Payment
              </th>
              {canManage ? (
                <th scope="col" className="px-5 py-3 font-medium">
                  Admin update
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {rows.map((row) => {
              const paymentStatus = row.payment?.status ?? "pending";

              return (
                <tr key={row.invoice.id}>
                  {mode === "staff" ? (
                    <td className="px-5 py-4 align-top">
                      <Link
                        href={`/contractors/${row.invoice.contractor_id}/payments`}
                        className="font-medium text-teal-800 hover:text-teal-950"
                      >
                        {row.contractor?.legal_name ?? "Unknown contractor"}
                      </Link>
                      <p className="mt-1 text-neutral-600">
                        {row.contractor?.email ?? "No email"}
                      </p>
                    </td>
                  ) : null}
                  <td className="px-5 py-4 align-top">
                    <p className="font-medium text-neutral-950">
                      {row.invoice.invoice_number}
                    </p>
                    <p className="mt-1 text-neutral-600">
                      Invoice date {formatDate(row.invoice.invoice_date)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Uploaded {formatDateTime(row.invoice.created_at)}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="font-medium text-neutral-950">
                      {row.project?.name ?? "Unknown project"}
                    </p>
                    <p className="mt-1 text-neutral-600">
                      {row.project?.client_label ?? "No client label"}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top text-neutral-700">
                    <p>{formatCurrency(row.invoice.gross_amount, row.invoice.currency)}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Net {formatCurrency(row.invoice.net_amount, row.invoice.currency)}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <PaymentStatusBadge status={paymentStatus} />
                    {mode === "contractor" && !row.payment ? (
                      <p className="mt-2 text-xs text-neutral-600">
                        Payment not recorded yet.
                      </p>
                    ) : (
                      <dl className="mt-3 space-y-1 text-xs text-neutral-600">
                        <div>
                          <dt className="inline font-medium text-neutral-500">
                            Date:{" "}
                          </dt>
                          <dd className="inline">
                            {formatDate(row.payment?.payment_date ?? null)}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium text-neutral-500">
                            Amount:{" "}
                          </dt>
                          <dd className="inline">
                            {formatCurrency(
                              row.payment?.paid_amount ?? null,
                              row.payment?.currency ?? row.invoice.currency,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium text-neutral-500">
                            Reference:{" "}
                          </dt>
                          <dd className="inline">
                            {row.payment?.payment_reference ?? "Not set"}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </td>
                  {canManage ? (
                    <td className="px-5 py-4 align-top">
                      <PaymentStatusForm row={row} />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
