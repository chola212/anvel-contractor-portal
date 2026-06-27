import Link from "next/link";

import {
  accountantExportStatuses,
  getAccountantExportRows,
  parseAccountantExportFilters,
} from "@/lib/exports/accountant";
import { invoiceStatusLabels } from "@/lib/invoices/format";
import { requireRole } from "@/lib/auth/profile";

type ExportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExportsPage({ searchParams }: ExportsPageProps) {
  await requireRole(["admin", "operations"]);

  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();
  const monthParam = resolvedSearchParams.month;
  const statusParam = resolvedSearchParams.status;

  if (typeof monthParam === "string") {
    params.set("month", monthParam);
  }

  if (typeof statusParam === "string") {
    params.set("status", statusParam);
  }

  const filters = parseAccountantExportFilters(params);
  const rows = await getAccountantExportRows(filters);
  const exportParams = new URLSearchParams();

  if (filters.month) {
    exportParams.set("month", filters.month);
  }

  exportParams.set("status", filters.status ?? "all");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Exports
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Download accountant-ready CSV files from uploaded invoice metadata,
          payment statement values, project labels and manual payment status.
        </p>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">
          Accountant invoice export
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          This export does not include bank details or private document links.
          Use it for accountant review and payment reconciliation.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Invoice month
            <input
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-950 shadow-sm"
              name="month"
              type="month"
              defaultValue={filters.month ?? ""}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Invoice status
            <select
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-950 shadow-sm"
              name="status"
              defaultValue={filters.status ?? "all"}
            >
              {accountantExportStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All statuses" : invoiceStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-3">
            <button
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Apply filters
            </button>
            <Link
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
              href="/exports"
            >
              Clear
            </Link>
          </div>
        </form>

        <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">
            {rows.length} invoice row{rows.length === 1 ? "" : "s"} match the
            current filters.
          </p>
          <Link
            className="inline-flex justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            href={`/exports/accountant?${exportParams.toString()}`}
          >
            Download CSV
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            Export preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Preview shows the first invoice rows that will be included in the
            CSV.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Gross</th>
                <th className="px-5 py-3 font-medium">Invoice status</th>
                <th className="px-5 py-3 font-medium">Payment status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-5 text-neutral-600" colSpan={6}>
                    No invoices match these filters.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 10).map((row) => (
                  <tr key={`${row.supplier_name}-${row.invoice_number}`}>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-neutral-950">
                        {row.supplier_name}
                      </p>
                      <p className="mt-1 text-neutral-600">{row.supplier_country}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-neutral-950">
                        {row.invoice_number}
                      </p>
                      <p className="mt-1 text-neutral-600">{row.invoice_date}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-neutral-950">{row.project}</p>
                      <p className="mt-1 text-neutral-600">{row.client_label}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      {row.currency} {row.gross_amount}
                    </td>
                    <td className="px-5 py-4 align-top">{row.invoice_status}</td>
                    <td className="px-5 py-4 align-top">{row.payment_status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
