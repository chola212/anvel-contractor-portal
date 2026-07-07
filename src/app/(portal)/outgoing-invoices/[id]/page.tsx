import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailField } from "@/components/contractors/detail-field";
import { ManualOutgoingInvoiceDraftForm } from "@/components/outgoing-invoices/manual-outgoing-invoice-draft-form";
import { OutgoingInvoiceActions } from "@/components/outgoing-invoices/outgoing-invoice-actions";
import { OutgoingInvoiceStatusBadge } from "@/components/outgoing-invoices/outgoing-invoice-status-badge";
import { requireRole } from "@/lib/auth/profile";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/invoices/format";
import {
  getOutgoingInvoiceAuditLogs,
  getOutgoingInvoiceById,
} from "@/lib/outgoing-invoices/queries";
import { formatTimesheetMonth } from "@/lib/timesheets/format";

function addressValue(line1: string | null, line2: string | null, fallback: string) {
  return [line1 ?? fallback, line2].filter(Boolean).join("\n");
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

export default async function OutgoingInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const invoice = await getOutgoingInvoiceById(id);
  if (!invoice) notFound();
  const auditLogs = await getOutgoingInvoiceAuditLogs(invoice.id);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <Link href="/outgoing-invoices" className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">Back to outgoing invoices</Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{invoice.invoice_number}</h1>
            <p className="mt-2 text-neutral-600">{invoice.billing_legal_name} - {invoicePeriodLabel(invoice)}</p>
          </div>
          <OutgoingInvoiceStatusBadge status={invoice.status} />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Net", formatCurrency(invoice.net_amount)],
          ["VAT", formatCurrency(invoice.vat_amount)],
          ["Total due", formatCurrency(invoice.gross_amount)],
          ["Due date", formatDate(invoice.due_date)],
        ].map(([label, value]) => <div key={label} className="rounded-md border border-neutral-200 bg-white p-4"><p className="text-sm text-neutral-500">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold">Billing recipient snapshot</h2>
          <dl className="mt-2">
            <DetailField label="Legal name" value={invoice.billing_legal_name} />
            <DetailField label="Email" value={invoice.billing_email} />
            <DetailField label="CC" value={invoice.billing_cc_emails.join(", ") || "None"} />
            <DetailField
              label="Address"
              value={addressValue(
                invoice.billing_address_line_1,
                invoice.billing_address_line_2,
                invoice.billing_address,
              )}
            />
            <DetailField label="Country" value={invoice.billing_country} />
            <DetailField label="VAT number" value={invoice.billing_vat_number} />
            <DetailField label="PO reference" value={invoice.po_reference ?? "None"} />
          </dl>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold">Company sender snapshot</h2>
          <dl className="mt-2">
            <DetailField label="Legal name" value={invoice.company_legal_name} />
            <DetailField
              label="Address"
              value={addressValue(
                invoice.company_address_line_1,
                invoice.company_address_line_2,
                invoice.company_address,
              )}
            />
            <DetailField label="Country" value={invoice.company_country} />
            <DetailField label="VAT number" value={invoice.company_vat_number} />
            <DetailField label="Bank" value={invoice.company_bank_name} />
            <DetailField label="IBAN" value={invoice.company_iban} />
            <DetailField label="SWIFT/BIC" value={invoice.company_swift_bic} />
          </dl>
        </div>
      </section>
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold">Source and commercial calculation</h2>
        <dl className="mt-2 grid gap-x-6 md:grid-cols-2">
          <DetailField label="Source" value={invoice.invoice_source === "manual" ? "Manual project invoice" : "Timesheet invoice"} />
          <DetailField label="Project" value={invoice.project_name} />
          <DetailField label="Consultant" value={invoice.consultant_name} />
          <DetailField label="Period" value={invoicePeriodLabel(invoice)} />
          <DetailField label={invoice.invoice_source === "manual" ? "Quantity" : "Approved hours"} value={String(invoice.quantity)} />
          <DetailField label={invoice.invoice_source === "manual" ? "Unit rate" : "Sales rate"} value={formatCurrency(invoice.sales_rate)} />
          <DetailField label="VAT treatment" value={invoice.vat_treatment.replaceAll("_", " ")} />
        </dl>
        <div className="mt-4 overflow-x-auto rounded-md border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">Description / concept</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2">{Number(line.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2">{line.unit_label}</td>
                  <td className="px-3 py-2">{formatCurrency(line.unit_rate)}</td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(line.net_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ManualOutgoingInvoiceDraftForm invoice={invoice} />
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold">PDF, email and payment</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {invoice.pdf_file_path ? <Link href={`/outgoing-invoices/${invoice.id}/download`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium">Download PDF</Link> : <span className="text-sm text-amber-700">PDF not generated</span>}
        </div>
        <dl className="mt-3 grid gap-x-6 md:grid-cols-2">
          <DetailField label="Email status" value={invoice.email_status.replace("_", " ")} />
          <DetailField label="Sent at" value={formatDateTime(invoice.sent_at)} />
          <DetailField label="Paid at" value={formatDateTime(invoice.paid_at)} />
          <DetailField label="Paid amount" value={formatCurrency(invoice.paid_amount)} />
          <DetailField label="Payment reference" value={invoice.payment_reference ?? "Not set"} />
          <DetailField label="Internal note" value={invoice.internal_note ?? "Not set"} />
          <DetailField label="Cancellation reason" value={invoice.cancellation_reason ?? "Not set"} />
          <DetailField label="Cancellation email" value={invoice.cancellation_email_status.replace("_", " ")} />
        </dl>
      </section>
      <OutgoingInvoiceActions invoice={invoice} />
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold">Advanced details</h2>
        <dl className="mt-3 grid gap-x-6 md:grid-cols-2">
          <DetailField label="Timesheet ID" value={invoice.timesheet_id ?? "Not set"} />
          <DetailField label="Cancelled at" value={formatDateTime(invoice.cancelled_at)} />
          <DetailField label="Cancellation emailed at" value={formatDateTime(invoice.cancellation_emailed_at)} />
          <DetailField label="Replaces invoice" value={invoice.replaces_invoice_id ?? "Not set"} />
          <DetailField label="Replaced by invoice" value={invoice.replaced_by_invoice_id ?? "Not set"} />
          <DetailField label="Number manually edited" value={invoice.invoice_number_manually_edited ? "Yes" : "No"} />
          <DetailField label="Previous invoice number" value={invoice.previous_invoice_number ?? "Not set"} />
        </dl>
      </section>
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold">Audit history</h2>
        {auditLogs.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No audit events recorded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex justify-between gap-4 py-2 text-sm">
                <span>{log.action.replaceAll("_", " ")}</span>
                <span className="text-neutral-500">{formatDateTime(log.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
