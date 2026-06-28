import Link from "next/link";

import { ManualOutgoingInvoiceCreateForm } from "@/components/outgoing-invoices/manual-outgoing-invoice-create-form";
import { OutgoingInvoiceStatusBadge } from "@/components/outgoing-invoices/outgoing-invoice-status-badge";
import { requireRole } from "@/lib/auth/profile";
import { getContractorsForStaff } from "@/lib/contractors/queries";
import { formatCurrency, formatDate } from "@/lib/invoices/format";
import {
  getManualOutgoingInvoiceProjectOptions,
  getOutgoingInvoices,
} from "@/lib/outgoing-invoices/queries";
import { getProjectsForStaff } from "@/lib/projects/queries";
import { formatTimesheetMonth } from "@/lib/timesheets/format";

type SearchParams = Record<string, string | string[] | undefined>;
function value(params: SearchParams, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] ?? "" : item ?? "";
}

function invoicePeriodLabel(invoice: {
  invoice_source: string;
  period_label: string | null;
  year: number;
  month: number;
}) {
  if (invoice.period_label) return invoice.period_label;
  if (invoice.invoice_source === "manual") return "Not set";
  return formatTimesheetMonth(invoice.year, invoice.month);
}

export default async function OutgoingInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const filters = {
    status: value(params, "status"),
    projectId: value(params, "projectId"),
    contractorId: value(params, "contractorId"),
    month: Number(value(params, "month")) || undefined,
    year: Number(value(params, "year")) || undefined,
    billingLegalName: value(params, "billingLegalName"),
    invoiceNumber: value(params, "invoiceNumber"),
  };
  const [invoices, projects, contractors, manualProjectOptions] = await Promise.all([
    getOutgoingInvoices(filters),
    getProjectsForStaff(),
    getContractorsForStaff(),
    getManualOutgoingInvoiceProjectOptions(),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <h1 className="text-3xl font-semibold text-neutral-950">Outgoing Invoices</h1>
        <p className="mt-2 text-neutral-600">Admin review, manual sending and payment tracking for client billing.</p>
      </section>
      <ManualOutgoingInvoiceCreateForm projects={manualProjectOptions} />
      <form className="grid gap-3 rounded-md border border-neutral-200 bg-white p-4 md:grid-cols-4">
        <select name="status" defaultValue={filters.status} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["draft", "sent", "paid", "overdue", "cancelled"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <select name="projectId" defaultValue={filters.projectId} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select name="contractorId" defaultValue={filters.contractorId} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All consultants</option>
          {contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.legal_name}</option>)}
        </select>
        <input name="invoiceNumber" defaultValue={filters.invoiceNumber} placeholder="Invoice number" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <input name="billingLegalName" defaultValue={filters.billingLegalName} placeholder="Billing legal name" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <input name="month" type="number" min="1" max="12" defaultValue={filters.month} placeholder="Month" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <input name="year" type="number" min="2024" max="2100" defaultValue={filters.year} placeholder="Year" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        <button className="rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white">Apply filters</button>
      </form>
      {invoices.length === 0 ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold">No outgoing invoices found</h2>
          <p className="mt-2 text-sm text-neutral-600">Drafts are created when an eligible timesheet is approved or when an admin creates a manual project invoice.</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>{["Invoice", "Source", "Billing legal name", "Project", "Consultant", "Period", "Net", "VAT", "Gross", "Status", "Due date", "Email"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-medium"><Link className="text-teal-800 hover:underline" href={`/outgoing-invoices/${invoice.id}`}>{invoice.invoice_number}</Link></td>
                  <td className="px-4 py-3 capitalize">{invoice.invoice_source}</td>
                  <td className="px-4 py-3">{invoice.billing_legal_name}</td>
                  <td className="px-4 py-3">{invoice.project_name}</td>
                  <td className="px-4 py-3">{invoice.consultant_name}</td>
                  <td className="px-4 py-3">{invoicePeriodLabel(invoice)}</td>
                  <td className="px-4 py-3">{formatCurrency(invoice.net_amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(invoice.vat_amount)}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(invoice.gross_amount)}</td>
                  <td className="px-4 py-3"><OutgoingInvoiceStatusBadge status={invoice.status} /></td>
                  <td className="px-4 py-3">{formatDate(invoice.due_date)}</td>
                  <td className="px-4 py-3 capitalize">{invoice.email_status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
