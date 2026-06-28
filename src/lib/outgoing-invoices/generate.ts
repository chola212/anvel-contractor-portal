import { selectSingleStatementRate } from "@/lib/payment-statements/rate-selection";
import type { TimesheetEntryRecord, TimesheetRecord } from "@/lib/timesheets/types";
import { formatTimesheetMonth } from "@/lib/timesheets/format";

import { createOutgoingInvoicePdf } from "./pdf";
import type {
  CompanyInvoiceSettings,
  OutgoingInvoiceDetail,
  ProjectBillingDetails,
} from "./types";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addThirtyDays(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

async function loadPrerequisites(supabase: SupabaseClient, timesheet: TimesheetRecord) {
  const [settingsResult, billingResult, projectResult, contractorResult, assignmentResult, entryResult] =
    await Promise.all([
      supabase.from("company_invoice_settings").select("*").limit(1).maybeSingle<CompanyInvoiceSettings>(),
      supabase.from("project_billing_details").select("*").eq("project_id", timesheet.project_id).maybeSingle<ProjectBillingDetails>(),
      supabase.from("projects").select("id,name").eq("id", timesheet.project_id).maybeSingle<{ id: string; name: string }>(),
      supabase.from("contractors").select("id,legal_name,email").eq("id", timesheet.contractor_id).maybeSingle<{ id: string; legal_name: string; email: string }>(),
      supabase.from("contractor_projects").select("id,start_date,end_date,sales_rate,currency").eq("project_id", timesheet.project_id).eq("contractor_id", timesheet.contractor_id).returns<{ id: string; start_date: string | null; end_date: string | null; sales_rate: number | string | null; currency: string }[]>(),
      supabase.from("timesheet_entries").select("work_date,hours").eq("timesheet_id", timesheet.id).returns<Pick<TimesheetEntryRecord, "work_date" | "hours">[]>(),
    ]);

  if (!settingsResult.data) throw new Error("Complete company invoice settings before approving this timesheet.");
  if (!billingResult.data) throw new Error("Complete project billing details before approving this timesheet.");
  if (!billingResult.data.billing_vat_number) throw new Error("Add the project billing VAT number before approving this timesheet.");
  if (!projectResult.data) throw new Error("The project could not be loaded for outgoing billing.");
  if (!contractorResult.data) throw new Error("The consultant could not be loaded for outgoing billing.");
  if (entryResult.error || entryResult.data.length === 0) throw new Error("Approved timesheets need worked hours for outgoing billing.");
  if (assignmentResult.error || assignmentResult.data.length === 0) throw new Error("No assignment covers this timesheet for outgoing billing.");
  if (assignmentResult.data.some((assignment) => assignment.sales_rate === null)) {
    throw new Error("Set the assignment sales rate before approving this timesheet.");
  }

  const rateSelection = selectSingleStatementRate(
    entryResult.data,
    assignmentResult.data.map((assignment) => ({
      ...assignment,
      hourly_rate: assignment.sales_rate as number | string,
    })),
  );
  if (!rateSelection.ok) throw new Error(`Outgoing sales rate error: ${rateSelection.message}`);
  if (rateSelection.currency !== "EUR") throw new Error("Outgoing invoices support EUR only.");

  return {
    settings: settingsResult.data,
    billing: billingResult.data,
    project: projectResult.data,
    contractor: contractorResult.data,
    entries: entryResult.data,
    salesRate: roundMoney(rateSelection.hourlyRate),
  };
}

export async function validateOutgoingInvoicePrerequisites({
  supabase,
  timesheet,
}: {
  supabase: SupabaseClient;
  timesheet: TimesheetRecord;
}) {
  await loadPrerequisites(supabase, timesheet);
}

export async function generateOutgoingInvoiceForTimesheet({
  supabase,
  timesheet,
  actorProfileId,
}: {
  supabase: SupabaseClient;
  timesheet: TimesheetRecord;
  actorProfileId: string;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("outgoing_invoices")
    .select("id")
    .eq("timesheet_id", timesheet.id)
    .neq("status", "cancelled")
    .maybeSingle<{ id: string }>();
  if (existingError) throw new Error(`Could not check outgoing invoice: ${existingError.message}`);
  if (existing) return { invoiceId: existing.id, alreadyGenerated: true };

  const context = await loadPrerequisites(supabase, timesheet);
  const quantity = roundMoney(
    context.entries.reduce((total, entry) => total + Number(entry.hours), 0),
  );
  const netAmount = roundMoney(quantity * context.salesRate);
  const vatRate = context.billing.vat_treatment === "cyprus_vat_19" ? 19 : 0;
  const vatAmount = roundMoney(netAmount * (vatRate / 100));
  const grossAmount = roundMoney(netAmount + vatAmount);
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const dueDate = addThirtyDays(invoiceDate);
  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_outgoing_invoice_number",
    { invoice_year: Number(invoiceDate.slice(0, 4)) },
  );
  if (numberError || !invoiceNumber) throw new Error(`Could not allocate outgoing invoice number: ${numberError?.message ?? "Unknown error"}`);

  const monthLabel = formatTimesheetMonth(timesheet.year, timesheet.month);
  const descriptionPrefix =
    context.billing.default_invoice_description?.trim() || "Consultancy fees";
  const description = `${descriptionPrefix} - ${context.contractor.legal_name} - ${context.project.name} - ${monthLabel}`;
  const invoiceId = crypto.randomUUID();
  const fileName = `${String(invoiceNumber).toLowerCase()}.pdf`;
  const filePath = `invoices/${invoiceId}/${fileName}`;
  const payload = {
    id: invoiceId,
    timesheet_id: timesheet.id,
    project_id: timesheet.project_id,
    contractor_id: timesheet.contractor_id,
    invoice_number: invoiceNumber,
    invoice_number_manually_edited: false,
    invoice_number_edited_at: null,
    invoice_number_edited_by: null,
    previous_invoice_number: null,
    replaces_invoice_id: null,
    replaced_by_invoice_id: null,
    invoice_date: invoiceDate,
    due_date: dueDate,
    year: timesheet.year,
    month: timesheet.month,
    status: "draft",
    currency: "EUR",
    company_legal_name: context.settings.company_legal_name,
    company_trading_name: context.settings.trading_name,
    company_address: context.settings.company_address,
    company_address_line_1:
      context.settings.company_address_line_1 ?? context.settings.company_address,
    company_address_line_2: context.settings.company_address_line_2,
    company_city_region: context.settings.company_city_region,
    company_country: context.settings.company_country,
    company_vat_number: context.settings.company_vat_number,
    company_bank_name: context.settings.bank_name,
    company_bank_account_name: context.settings.bank_account_name,
    company_iban: context.settings.iban,
    company_swift_bic: context.settings.swift_bic,
    company_invoice_notes: context.settings.default_invoice_notes,
    billing_legal_name: context.billing.billing_legal_name,
    billing_email: context.billing.billing_email,
    billing_cc_emails: context.billing.billing_cc_emails,
    billing_address: context.billing.billing_address,
    billing_address_line_1:
      context.billing.billing_address_line_1 ?? context.billing.billing_address,
    billing_address_line_2: context.billing.billing_address_line_2,
    billing_country: context.billing.billing_country,
    billing_vat_number: context.billing.billing_vat_number,
    po_reference: context.billing.po_reference,
    billing_invoice_notes: context.billing.invoice_notes,
    project_name: context.project.name,
    consultant_name: context.contractor.legal_name,
    consultant_email: context.contractor.email,
    quantity,
    unit_label: "hours",
    sales_rate: context.salesRate,
    net_amount: netAmount,
    vat_treatment: context.billing.vat_treatment,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    gross_amount: grossAmount,
    email_status: "not_sent",
    created_by: actorProfileId,
  };
  const { error: insertError } = await supabase.from("outgoing_invoices").insert(payload);
  if (insertError) {
    if (insertError.code === "23505") {
      const { data } = await supabase
        .from("outgoing_invoices")
        .select("id")
        .eq("timesheet_id", timesheet.id)
        .neq("status", "cancelled")
        .maybeSingle<{ id: string }>();
      if (data) {
        return { invoiceId: data.id, alreadyGenerated: true };
      }
    }
    throw new Error(`Could not save outgoing invoice: ${insertError.message}`);
  }
  const { error: lineError } = await supabase.from("outgoing_invoice_lines").insert({
    outgoing_invoice_id: invoiceId,
    description,
    quantity,
    unit_label: "hours",
    unit_rate: context.salesRate,
    net_amount: netAmount,
    sort_order: 1,
  });
  if (lineError) throw new Error(`Could not save outgoing invoice line: ${lineError.message}`);

  const invoice = { ...payload, pdf_file_path: null, pdf_file_name: null, sent_at: null, paid_at: null, paid_amount: null, payment_reference: null, internal_note: null, sent_by: null, paid_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), lines: [{ id: crypto.randomUUID(), outgoing_invoice_id: invoiceId, description, quantity, unit_label: "hours", unit_rate: context.salesRate, net_amount: netAmount, sort_order: 1, created_at: new Date().toISOString() }] } as OutgoingInvoiceDetail;
  const pdf = createOutgoingInvoicePdf(invoice);
  const { error: uploadError } = await supabase.storage.from("outgoing-invoices").upload(filePath, Buffer.from(pdf), { contentType: "application/pdf", upsert: false });
  if (uploadError) throw new Error(`Outgoing invoice draft was created, but PDF storage failed: ${uploadError.message}`);
  await supabase.from("outgoing_invoices").update({ pdf_file_path: filePath, pdf_file_name: fileName }).eq("id", invoiceId);
  await supabase.from("audit_logs").insert({
    actor_profile_id: actorProfileId,
    action: "outgoing_invoice_generated",
    entity_type: "outgoing_invoice",
    entity_id: invoiceId,
    metadata: { timesheet_id: timesheet.id, invoice_number: invoiceNumber },
  });
  return { invoiceId, alreadyGenerated: false };
}
