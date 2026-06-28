import { buildSelfBillingInvoiceEmail, sendPortalEmail } from "@/lib/email/portal-email";
import { formatCurrency } from "@/lib/invoices/format";
import { selectSingleStatementRate } from "@/lib/payment-statements/rate-selection";
import type { VatTreatment } from "@/lib/contractors/types";
import { createClient } from "@/lib/supabase/server";
import { formatTimesheetMonth, formatHours } from "@/lib/timesheets/format";
import type { TimesheetEntryRecord, TimesheetRecord } from "@/lib/timesheets/types";

import { createSelfBillingInvoicePdf } from "./pdf";

const invoiceBucket = "contractor-invoices";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ContractorForSelfBilling = {
  id: string;
  legal_name: string;
  email: string;
  vat_treatment: VatTreatment | null;
  vat_number: string | null;
  tax_number: string | null;
};

type ProjectForSelfBilling = {
  id: string;
  name: string;
};

type StatementForSelfBilling = {
  id: string;
  total_hours: number | string;
  hourly_rate: number | string;
  net_amount: number | string;
  vat_treatment: VatTreatment;
  vat_amount: number | string;
  gross_amount: number | string;
  currency: string;
};

type AssignmentForSelfBilling = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  hourly_rate: number | string;
  currency: string;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateVatAmount(netAmount: number, vatTreatment: VatTreatment) {
  return vatTreatment === "cyprus_vat_19" ? roundMoney(netAmount * 0.19) : 0;
}

function sumHours(entries: Pick<TimesheetEntryRecord, "hours">[]) {
  return entries.reduce((total, entry) => total + Number(entry.hours), 0);
}

async function getOrCreatePaymentStatement(
  supabase: SupabaseServerClient,
  timesheet: TimesheetRecord,
  contractor: ContractorForSelfBilling,
  actorProfileId: string,
) {
  const { data: existingStatement, error: existingError } = await supabase
    .from("payment_statements")
    .select("id,total_hours,hourly_rate,net_amount,vat_treatment,vat_amount,gross_amount,currency")
    .eq("timesheet_id", timesheet.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<StatementForSelfBilling>();

  if (existingError) {
    throw new Error(`Could not check payment statement: ${existingError.message}`);
  }

  if (existingStatement) {
    return existingStatement;
  }

  if (!contractor.vat_treatment) {
    throw new Error("Set the contractor VAT treatment before approving for self-billing.");
  }

  const [assignmentResult, entryResult] = await Promise.all([
    supabase
      .from("contractor_projects")
      .select("id,start_date,end_date,hourly_rate,currency")
      .eq("contractor_id", timesheet.contractor_id)
      .eq("project_id", timesheet.project_id)
      .returns<AssignmentForSelfBilling[]>(),
    supabase
      .from("timesheet_entries")
      .select("work_date,hours")
      .eq("timesheet_id", timesheet.id)
      .returns<Pick<TimesheetEntryRecord, "work_date" | "hours">[]>(),
  ]);

  if (assignmentResult.error || assignmentResult.data.length === 0) {
    throw new Error(
      assignmentResult.error?.message ?? "No assignment rate covers this timesheet.",
    );
  }

  if (entryResult.error) {
    throw new Error(`Could not load timesheet hours: ${entryResult.error.message}`);
  }

  const totalHours = roundMoney(sumHours(entryResult.data));

  if (totalHours <= 0) {
    throw new Error("Approved timesheets need at least one hour for self-billing.");
  }

  const rateSelection = selectSingleStatementRate(
    entryResult.data,
    assignmentResult.data,
  );

  if (!rateSelection.ok) {
    throw new Error(rateSelection.message);
  }

  const hourlyRate = roundMoney(rateSelection.hourlyRate);
  const netAmount = roundMoney(totalHours * hourlyRate);
  const vatAmount = calculateVatAmount(netAmount, contractor.vat_treatment);
  const grossAmount = roundMoney(netAmount + vatAmount);
  const { data: statement, error: insertError } = await supabase
    .from("payment_statements")
    .insert({
      timesheet_id: timesheet.id,
      contractor_id: timesheet.contractor_id,
      project_id: timesheet.project_id,
      total_hours: totalHours,
      hourly_rate: hourlyRate,
      net_amount: netAmount,
      vat_treatment: contractor.vat_treatment,
      vat_amount: vatAmount,
      gross_amount: grossAmount,
      currency: rateSelection.currency,
      created_by: actorProfileId,
    })
    .select("id,total_hours,hourly_rate,net_amount,vat_treatment,vat_amount,gross_amount,currency")
    .single<StatementForSelfBilling>();

  if (insertError || !statement) {
    throw new Error(
      insertError?.code === "23505"
        ? "A payment statement already exists for this timesheet."
        : `Could not create payment statement: ${insertError?.message ?? "Unknown error"}`,
    );
  }

  return statement;
}

async function nextInvoiceNumber(
  supabase: SupabaseServerClient,
  year: number,
  month: number,
) {
  const prefix = `SBI-${year}-${String(month).padStart(2, "0")}`;
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("invoice_type", "self_billing")
    .like("invoice_number", `${prefix}-%`);

  if (error) {
    throw new Error(`Could not allocate invoice number: ${error.message}`);
  }

  return `${prefix}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function generateSelfBillingInvoiceForTimesheet({
  supabase,
  timesheet,
  actorProfileId,
}: {
  supabase: SupabaseServerClient;
  timesheet: TimesheetRecord;
  actorProfileId: string;
}) {
  const { data: existingInvoice, error: existingInvoiceError } = await supabase
    .from("invoices")
    .select("id,email_status")
    .eq("timesheet_id", timesheet.id)
    .eq("invoice_type", "self_billing")
    .neq("status", "cancelled")
    .maybeSingle<{ id: string; email_status: string }>();

  if (existingInvoiceError) {
    throw new Error(`Could not check self-billing invoice: ${existingInvoiceError.message}`);
  }

  if (existingInvoice) {
    return {
      invoiceId: existingInvoice.id,
      alreadyGenerated: true,
      emailStatus: existingInvoice.email_status,
    };
  }

  const [contractorResult, projectResult] = await Promise.all([
    supabase
      .from("contractors")
      .select("id,legal_name,email,vat_treatment,vat_number,tax_number")
      .eq("id", timesheet.contractor_id)
      .maybeSingle<ContractorForSelfBilling>(),
    supabase
      .from("projects")
      .select("id,name")
      .eq("id", timesheet.project_id)
      .maybeSingle<ProjectForSelfBilling>(),
  ]);

  if (contractorResult.error || !contractorResult.data) {
    throw new Error("The contractor profile could not be loaded for self-billing.");
  }

  if (projectResult.error || !projectResult.data) {
    throw new Error("The project could not be loaded for self-billing.");
  }

  const contractor = contractorResult.data;
  const project = projectResult.data;
  const statement = await getOrCreatePaymentStatement(
    supabase,
    timesheet,
    contractor,
    actorProfileId,
  );
  const invoiceId = crypto.randomUUID();
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const invoiceNumber = await nextInvoiceNumber(
    supabase,
    timesheet.year,
    timesheet.month,
  );
  const monthLabel = formatTimesheetMonth(timesheet.year, timesheet.month);
  const fileName = `${invoiceNumber.toLowerCase()}.pdf`;
  const filePath = `contractors/${contractor.id}/invoices/${invoiceId}-${fileName}`;
  const pdf = createSelfBillingInvoicePdf({
    invoiceNumber,
    invoiceDate,
    contractorLegalName: contractor.legal_name,
    contractorEmail: contractor.email,
    contractorVatNumber: contractor.vat_number,
    contractorTaxNumber: contractor.tax_number,
    projectName: project.name,
    monthLabel,
    totalHours: formatHours(statement.total_hours),
    hourlyRate: formatCurrency(statement.hourly_rate, statement.currency),
    netAmount: formatCurrency(statement.net_amount, statement.currency),
    vatTreatment: statement.vat_treatment,
    vatAmount: formatCurrency(statement.vat_amount, statement.currency),
    grossAmount: formatCurrency(statement.gross_amount, statement.currency),
    currency: statement.currency,
  });

  const { error: uploadError } = await supabase.storage
    .from(invoiceBucket)
    .upload(filePath, Buffer.from(pdf), {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Could not store self-billing PDF: ${uploadError.message}`);
  }

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      id: invoiceId,
      payment_statement_id: statement.id,
      timesheet_id: timesheet.id,
      contractor_id: contractor.id,
      invoice_type: "self_billing",
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      net_amount: statement.net_amount,
      vat_amount: statement.vat_amount,
      gross_amount: statement.gross_amount,
      currency: statement.currency,
      file_path: filePath,
      file_name: fileName,
      status: "approved_for_payment",
      generated_by: actorProfileId,
      generated_at: new Date().toISOString(),
      email_status: "not_sent",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !invoice) {
    await supabase.storage.from(invoiceBucket).remove([filePath]);
    throw new Error(
      insertError?.code === "23505"
        ? "A self-billing invoice already exists for this timesheet."
        : `Could not save self-billing invoice: ${insertError?.message ?? "Unknown error"}`,
    );
  }

  let emailStatus: "sent" | "failed" = "failed";

  try {
    const email = buildSelfBillingInvoiceEmail(
      contractor.legal_name,
      monthLabel,
      invoiceNumber,
      project.name,
    );
    const result = await sendPortalEmail({
      to: contractor.email,
      ...email,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(pdf).toString("base64"),
        },
      ],
    });
    emailStatus = result.sent ? "sent" : "failed";
  } catch (error) {
    console.error("Self-billing email failed", error);
    emailStatus = "failed";
  }

  await supabase
    .from("invoices")
    .update({
      email_status: emailStatus,
      emailed_at: emailStatus === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", invoice.id);

  await supabase.from("audit_logs").insert({
    actor_profile_id: actorProfileId,
    action: "self_billing_invoice_generated",
    entity_type: "invoice",
    entity_id: invoice.id,
    metadata: {
      timesheet_id: timesheet.id,
      payment_statement_id: statement.id,
      invoice_number: invoiceNumber,
      email_status: emailStatus,
    },
  });

  return {
    invoiceId: invoice.id,
    alreadyGenerated: false,
    emailStatus,
  };
}
