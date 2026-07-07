"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import {
  buildOutgoingInvoiceCancellationEmail,
  buildOutgoingInvoiceEmail,
  sendPortalEmail,
} from "@/lib/email/portal-email";
import { formatTimesheetMonth } from "@/lib/timesheets/format";
import { createClient } from "@/lib/supabase/server";
import { getOutgoingInvoiceById } from "@/lib/outgoing-invoices/queries";
import { createOutgoingInvoicePdf } from "@/lib/outgoing-invoices/pdf";
import type {
  CompanyInvoiceSettings,
  OutgoingInvoice,
  ProjectBillingDetails,
} from "@/lib/outgoing-invoices/types";

const invoiceIdSchema = z.object({
  invoiceId: z.string().uuid("Invoice is missing."),
});
const optionalText = z.string().trim().max(1000).transform((value) => value || null);
const DEFAULT_MANUAL_CONSULTANT_NAME = "Andres Velasco";
const manualInvoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Enter a line description.").max(500),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than 0."),
  unitLabel: z.string().trim().min(1, "Enter a unit.").max(40),
  unitRate: z.coerce.number().nonnegative("Rate cannot be negative."),
});
const manualInvoiceLinesSchema = z.string().transform((value, context) => {
  try {
    return JSON.parse(value);
  } catch {
    context.addIssue({
      code: "custom",
      message: "Invoice lines could not be read.",
    });
    return z.NEVER;
  }
}).pipe(
  z.array(manualInvoiceLineSchema)
    .min(1, "Add at least one invoice line.")
    .superRefine((lines, context) => {
      const totalNetAmount = lines.reduce(
        (total, line) => total + line.quantity * line.unitRate,
        0,
      );
      if (totalNetAmount <= 0) {
        context.addIssue({
          code: "custom",
          message: "Total net amount must be greater than 0.",
        });
      }
    }),
);
const manualInvoiceDraftSchema = z.object({
  projectId: z.string().uuid("Select a project."),
  consultantName: z.string().trim().min(1, "Enter a consultant name.").max(160),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter an invoice date."),
  periodLabel: z.string().trim().max(80, "Keep the period label under 80 characters.").transform((value) => value || null),
  linesJson: manualInvoiceLinesSchema,
  invoiceNotes: optionalText,
});
const updateManualInvoiceDraftSchema = manualInvoiceDraftSchema
  .omit({ projectId: true, invoiceDate: true })
  .extend(invoiceIdSchema.shape);
const paidSchema = invoiceIdSchema.extend({
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a paid date."),
  paidAmount: z.coerce.number().nonnegative("Paid amount cannot be negative."),
  paymentReference: z.string().trim().max(200).transform((value) => value || null),
  internalNote: z.string().trim().max(1000).transform((value) => value || null),
});
const updateInvoiceNumberSchema = invoiceIdSchema.extend({
  invoiceNumber: z.string().trim().min(1, "Enter an invoice number.").max(80, "Keep the invoice number under 80 characters."),
});
const cancelSchema = invoiceIdSchema.extend({
  cancellationReason: z.string().trim().max(1000, "Keep the cancellation reason under 1000 characters.").transform((value) => value || "Cancelled by ANVEL admin."),
});

export type OutgoingInvoiceActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string[] | undefined>;
  invoiceId?: string;
};

function errorState(message: string): OutgoingInvoiceActionState {
  return { status: "error", message, fieldErrors: {} };
}

function addThirtyDays(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function vatRateForTreatment(vatTreatment: string) {
  return vatTreatment === "cyprus_vat_19" ? 19 : 0;
}

function calculateManualInvoiceTotals(lines: z.infer<typeof manualInvoiceLineSchema>[]) {
  const invoiceLines = lines.map((line, index) => {
    const quantity = roundMoney(line.quantity);
    const unitRate = roundMoney(line.unitRate);
    return {
      description: line.description,
      quantity,
      unitLabel: line.unitLabel,
      unitRate,
      netAmount: roundMoney(quantity * unitRate),
      sortOrder: index + 1,
    };
  });
  const quantity = roundMoney(
    invoiceLines.reduce((total, line) => total + line.quantity, 0),
  );
  const netAmount = roundMoney(
    invoiceLines.reduce((total, line) => total + line.netAmount, 0),
  );
  const firstUnitLabel = invoiceLines[0]?.unitLabel ?? "mixed";
  const unitLabel = invoiceLines.every((line) => line.unitLabel === firstUnitLabel)
    ? firstUnitLabel
    : "mixed";
  const salesRate = invoiceLines.length === 1
    ? invoiceLines[0].unitRate
    : quantity > 0
      ? roundMoney(netAmount / quantity)
      : 0;

  return {
    invoiceLines,
    quantity,
    unitLabel,
    salesRate,
    netAmount,
  };
}

function isProjectInForce(project: {
  status: string;
  start_date: string | null;
  end_date: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    project.status === "active"
    && (!project.start_date || project.start_date <= today)
    && (!project.end_date || project.end_date >= today)
  );
}

function hasCompleteProjectBillingDetails(billing: ProjectBillingDetails | null) {
  if (!billing) return false;
  return [
    billing.billing_legal_name,
    billing.billing_email,
    billing.billing_address,
    billing.billing_country,
    billing.billing_vat_number,
  ].every((value) => value.trim().length > 0);
}

function outgoingInvoicePeriodLabel(
  invoice: Pick<OutgoingInvoice, "invoice_source" | "period_label" | "year" | "month">,
) {
  if (invoice.period_label?.trim()) return invoice.period_label.trim();
  if (invoice.invoice_source === "manual") return null;
  return formatTimesheetMonth(invoice.year, invoice.month);
}

async function loadManualInvoiceContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
) {
  const [settingsResult, projectResult, billingResult] = await Promise.all([
    supabase.from("company_invoice_settings").select("*").limit(1).maybeSingle<CompanyInvoiceSettings>(),
    supabase
      .from("projects")
      .select("id,name,status,start_date,end_date")
      .eq("id", projectId)
      .maybeSingle<{
        id: string;
        name: string;
        status: string;
        start_date: string | null;
        end_date: string | null;
      }>(),
    supabase
      .from("project_billing_details")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle<ProjectBillingDetails>(),
  ]);

  if (!settingsResult.data) {
    throw new Error("Complete company invoice settings before creating a manual invoice.");
  }
  if (!projectResult.data || !isProjectInForce(projectResult.data)) {
    throw new Error("Select an active in-force project.");
  }
  if (!billingResult.data || !hasCompleteProjectBillingDetails(billingResult.data)) {
    throw new Error("Project billing details are incomplete.");
  }

  return {
    settings: settingsResult.data,
    project: projectResult.data,
    billing: billingResult.data,
  };
}

function parseSequenceInvoiceNumber(value: string, fallbackYear: number) {
  const formatted = value.match(/^ANVEL-(\d{4})-(\d{1,10})$/i);
  if (formatted) {
    return {
      invoiceNumber: `ANVEL-${formatted[1]}-${String(Number(formatted[2])).padStart(4, "0")}`,
      sequenceYear: Number(formatted[1]),
      sequenceNumber: Number(formatted[2]),
      normalized: true,
    };
  }

  const plainNumber = value.match(/^\d{1,10}$/);
  if (plainNumber) {
    const sequenceNumber = Number(plainNumber[0]);
    return {
      invoiceNumber: `ANVEL-${fallbackYear}-${String(sequenceNumber).padStart(4, "0")}`,
      sequenceYear: fallbackYear,
      sequenceNumber,
      normalized: true,
    };
  }

  return {
    invoiceNumber: value,
    sequenceYear: null,
    sequenceNumber: null,
    normalized: false,
  };
}

async function syncOutgoingInvoiceSequence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sequenceYear: number | null,
  sequenceNumber: number | null,
) {
  if (!sequenceYear || !sequenceNumber) return;
  const { error } = await supabase.rpc("sync_outgoing_invoice_sequence", {
    invoice_year: sequenceYear,
    used_number: sequenceNumber,
  });
  if (error) {
    throw new Error(`Could not update outgoing invoice sequence: ${error.message}`);
  }
}

async function uploadOutgoingInvoicePdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
) {
  const invoice = await getOutgoingInvoiceById(invoiceId);
  if (!invoice) throw new Error("Outgoing invoice not found.");
  const pdf = createOutgoingInvoicePdf(invoice);
  const fileName = `${invoice.invoice_number.toLowerCase()}.pdf`;
  const filePath = `invoices/${invoice.id}/${fileName}`;
  const { error } = await supabase.storage
    .from("outgoing-invoices")
    .upload(filePath, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Could not regenerate PDF: ${error.message}`);
  const { error: updateError } = await supabase
    .from("outgoing_invoices")
    .update({ pdf_file_path: filePath, pdf_file_name: fileName })
    .eq("id", invoice.id);
  if (updateError) throw new Error(`Could not save PDF metadata: ${updateError.message}`);
}

export async function createManualOutgoingInvoiceAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = manualInvoiceDraftSchema.safeParse({
    projectId: formData.get("projectId"),
    consultantName: formData.get("consultantName") || DEFAULT_MANUAL_CONSULTANT_NAME,
    invoiceDate: formData.get("invoiceDate"),
    periodLabel: formData.get("periodLabel"),
    linesJson: formData.get("linesJson"),
    invoiceNotes: formData.get("invoiceNotes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the manual invoice details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  let context: Awaited<ReturnType<typeof loadManualInvoiceContext>>;
  try {
    context = await loadManualInvoiceContext(supabase, parsed.data.projectId);
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Could not load project billing details.");
  }

  const invoiceDate = parsed.data.invoiceDate;
  const dueDate = addThirtyDays(invoiceDate);
  const year = Number(invoiceDate.slice(0, 4));
  const month = Number(invoiceDate.slice(5, 7));
  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_outgoing_invoice_number",
    { invoice_year: year },
  );
  if (numberError || !invoiceNumber) {
    return errorState(`Could not allocate outgoing invoice number: ${numberError?.message ?? "Unknown error"}`);
  }

  const totals = calculateManualInvoiceTotals(parsed.data.linesJson);
  const vatRate = vatRateForTreatment(context.billing.vat_treatment);
  const vatAmount = roundMoney(totals.netAmount * (vatRate / 100));
  const grossAmount = roundMoney(totals.netAmount + vatAmount);
  const invoiceId = crypto.randomUUID();
  const payload = {
    id: invoiceId,
    invoice_source: "manual",
    period_label: parsed.data.periodLabel,
    timesheet_id: null,
    project_id: context.project.id,
    contractor_id: null,
    invoice_number: String(invoiceNumber),
    invoice_number_manually_edited: false,
    invoice_number_edited_at: null,
    invoice_number_edited_by: null,
    previous_invoice_number: null,
    replaces_invoice_id: null,
    replaced_by_invoice_id: null,
    invoice_date: invoiceDate,
    due_date: dueDate,
    year,
    month,
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
    billing_invoice_notes: parsed.data.invoiceNotes ?? context.billing.invoice_notes,
    project_name: context.project.name,
    consultant_name: parsed.data.consultantName,
    consultant_email: null,
    quantity: totals.quantity,
    unit_label: totals.unitLabel,
    sales_rate: totals.salesRate,
    net_amount: totals.netAmount,
    vat_treatment: context.billing.vat_treatment,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    gross_amount: grossAmount,
    email_status: "not_sent",
    cancellation_email_status: "not_required",
    cancellation_emailed_at: null,
    cancellation_reason: null,
    cancelled_at: null,
    cancelled_by: null,
    created_by: profile.id,
  };

  const { error: insertError } = await supabase.from("outgoing_invoices").insert(payload);
  if (insertError) return errorState(`Could not create manual invoice: ${insertError.message}`);

  const { error: lineError } = await supabase.from("outgoing_invoice_lines").insert(
    totals.invoiceLines.map((line) => ({
      outgoing_invoice_id: invoiceId,
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unitLabel,
      unit_rate: line.unitRate,
      net_amount: line.netAmount,
      sort_order: line.sortOrder,
    })),
  );
  if (lineError) return errorState(`Manual invoice was created, but its lines could not be saved: ${lineError.message}`);

  try {
    await uploadOutgoingInvoicePdf(supabase, invoiceId);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error
        ? `Manual invoice draft created, but PDF generation failed: ${error.message}`
        : "Manual invoice draft created, but PDF generation failed.",
      fieldErrors: {},
      invoiceId,
    };
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "manual_outgoing_invoice_created",
    entity_type: "outgoing_invoice",
    entity_id: invoiceId,
    metadata: {
      invoice_number: invoiceNumber,
      project_id: context.project.id,
      consultant_name: parsed.data.consultantName,
    },
  });
  revalidatePath("/outgoing-invoices");
  return {
    status: "success",
    message: `Manual invoice draft ${invoiceNumber} created.`,
    fieldErrors: {},
    invoiceId,
  };
}

export async function updateManualOutgoingInvoiceDraftAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = updateManualInvoiceDraftSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    consultantName: formData.get("consultantName") || DEFAULT_MANUAL_CONSULTANT_NAME,
    periodLabel: formData.get("periodLabel"),
    linesJson: formData.get("linesJson"),
    invoiceNotes: formData.get("invoiceNotes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the manual invoice details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const invoice = await getOutgoingInvoiceById(parsed.data.invoiceId);
  if (!invoice) return errorState("Outgoing invoice not found.");
  if (invoice.invoice_source !== "manual") return errorState("Only manual invoices can be edited here.");
  if (invoice.status !== "draft") return errorState("Only draft manual invoices can be edited.");

  const supabase = await createClient();
  const totals = calculateManualInvoiceTotals(parsed.data.linesJson);
  const vatRate = vatRateForTreatment(invoice.vat_treatment);
  const vatAmount = roundMoney(totals.netAmount * (vatRate / 100));
  const grossAmount = roundMoney(totals.netAmount + vatAmount);

  const { error: updateError } = await supabase.from("outgoing_invoices").update({
    consultant_name: parsed.data.consultantName,
    period_label: parsed.data.periodLabel,
    quantity: totals.quantity,
    unit_label: totals.unitLabel,
    sales_rate: totals.salesRate,
    net_amount: totals.netAmount,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    gross_amount: grossAmount,
    billing_invoice_notes: parsed.data.invoiceNotes,
  }).eq("id", invoice.id);
  if (updateError) return errorState(`Could not update manual invoice: ${updateError.message}`);

  const { error: deleteLinesError } = await supabase
    .from("outgoing_invoice_lines")
    .delete()
    .eq("outgoing_invoice_id", invoice.id);
  if (deleteLinesError) return errorState(`Manual invoice updated, but old lines could not be replaced: ${deleteLinesError.message}`);

  const { error: lineError } = await supabase.from("outgoing_invoice_lines").insert(
    totals.invoiceLines.map((line) => ({
      outgoing_invoice_id: invoice.id,
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unitLabel,
      unit_rate: line.unitRate,
      net_amount: line.netAmount,
      sort_order: line.sortOrder,
    })),
  );
  if (lineError) return errorState(`Manual invoice updated, but its lines could not be saved: ${lineError.message}`);

  try {
    await uploadOutgoingInvoicePdf(supabase, invoice.id);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? `Manual invoice updated, but PDF regeneration failed: ${error.message}`
        : "Manual invoice updated, but PDF regeneration failed.",
    );
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "manual_outgoing_invoice_updated",
    entity_type: "outgoing_invoice",
    entity_id: invoice.id,
    metadata: {
      invoice_number: invoice.invoice_number,
      consultant_name: parsed.data.consultantName,
      net_amount: totals.netAmount,
    },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return { status: "success", message: "Manual invoice draft updated.", fieldErrors: {} };
}

export async function regenerateOutgoingInvoicePdfAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  await requireRole(["admin"]);
  const parsed = invoiceIdSchema.safeParse({ invoiceId: formData.get("invoiceId") });
  if (!parsed.success) return errorState("Invoice is missing.");
  const invoice = await getOutgoingInvoiceById(parsed.data.invoiceId);
  if (!invoice) return errorState("Outgoing invoice not found.");
  if (invoice.status !== "draft") return errorState("Only draft invoices can regenerate their PDF.");

  const supabase = await createClient();
  try {
    await uploadOutgoingInvoicePdf(supabase, invoice.id);
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Could not regenerate PDF.");
  }
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return { status: "success", message: "Invoice PDF regenerated.", fieldErrors: {} };
}

export async function updateOutgoingInvoiceNumberAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = updateInvoiceNumberSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    invoiceNumber: formData.get("invoiceNumber"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the invoice number.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: invoice, error: loadError } = await supabase
    .from("outgoing_invoices")
    .select("id,invoice_number,status,year")
    .eq("id", parsed.data.invoiceId)
    .maybeSingle<{ id: string; invoice_number: string; status: string; year: number }>();
  if (loadError || !invoice) return errorState("Outgoing invoice not found.");
  if (invoice.status !== "draft") return errorState("Only draft invoice numbers can be edited.");

  const parsedNumber = parseSequenceInvoiceNumber(parsed.data.invoiceNumber, invoice.year);
  if (parsedNumber.invoiceNumber === invoice.invoice_number) {
    return { status: "success", message: "Invoice number unchanged.", fieldErrors: {} };
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("outgoing_invoices")
    .select("id")
    .eq("invoice_number", parsedNumber.invoiceNumber)
    .neq("id", invoice.id)
    .maybeSingle<{ id: string }>();
  if (duplicateError) return errorState(`Could not check invoice number uniqueness: ${duplicateError.message}`);
  if (duplicate) return errorState("This invoice number is already used.");

  try {
    await syncOutgoingInvoiceSequence(
      supabase,
      parsedNumber.sequenceYear,
      parsedNumber.sequenceNumber,
    );
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Could not update outgoing invoice sequence.");
  }

  const editedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("outgoing_invoices")
    .update({
      invoice_number: parsedNumber.invoiceNumber,
      invoice_number_manually_edited: true,
      invoice_number_edited_at: editedAt,
      invoice_number_edited_by: profile.id,
      previous_invoice_number: invoice.invoice_number,
    })
    .eq("id", invoice.id);
  if (updateError) {
    return errorState(
      updateError.code === "23505"
        ? "This invoice number is already used."
        : `Could not update invoice number: ${updateError.message}`,
    );
  }

  try {
    await uploadOutgoingInvoicePdf(supabase, invoice.id);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? `Invoice number updated, but PDF regeneration failed: ${error.message}`
        : "Invoice number updated, but PDF regeneration failed.",
    );
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "outgoing_invoice_number_updated",
    entity_type: "outgoing_invoice",
    entity_id: invoice.id,
    metadata: {
      previous_invoice_number: invoice.invoice_number,
      new_invoice_number: parsedNumber.invoiceNumber,
      normalized: parsedNumber.normalized,
    },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return {
    status: "success",
    message: parsedNumber.normalized
      ? `Invoice number updated to ${parsedNumber.invoiceNumber}. Future generated numbers for that year will be higher.`
      : "Legacy invoice number saved. The generated sequence was not lowered.",
    fieldErrors: {},
  };
}

export async function sendOutgoingInvoiceAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = invoiceIdSchema.safeParse({ invoiceId: formData.get("invoiceId") });
  if (!parsed.success) return errorState("Invoice is missing.");
  const invoice = await getOutgoingInvoiceById(parsed.data.invoiceId);
  if (!invoice) return errorState("Outgoing invoice not found.");
  if (invoice.status !== "draft") return errorState("Only draft invoices can be sent.");
  if (!invoice.pdf_file_path || !invoice.pdf_file_name) return errorState("Generate the invoice PDF before sending.");

  const supabase = await createClient();
  const { data: pdf, error: downloadError } = await supabase.storage
    .from("outgoing-invoices")
    .download(invoice.pdf_file_path);
  if (downloadError || !pdf) return errorState(`Could not load invoice PDF: ${downloadError?.message ?? "Unknown error"}`);

  try {
    const email = buildOutgoingInvoiceEmail({
      invoiceNumber: invoice.invoice_number,
      consultantName: invoice.consultant_name,
      monthLabel: outgoingInvoicePeriodLabel(invoice),
      projectName: invoice.project_name,
      poReference: invoice.po_reference,
      grossAmount: Number(invoice.gross_amount).toFixed(2),
      dueDate: invoice.due_date,
    });
    await sendPortalEmail({
      to: invoice.billing_email,
      cc: invoice.billing_cc_emails,
      ...email,
      attachments: [{
        filename: invoice.pdf_file_name,
        content: Buffer.from(await pdf.arrayBuffer()).toString("base64"),
      }],
    });
  } catch (error) {
    await supabase.from("outgoing_invoices").update({ email_status: "failed" }).eq("id", invoice.id);
    return errorState(error instanceof Error ? `Invoice email failed: ${error.message}` : "Invoice email failed.");
  }

  const sentAt = new Date().toISOString();
  const { error: updateError } = await supabase.from("outgoing_invoices").update({
    status: "sent",
    email_status: "sent",
    sent_at: sentAt,
    sent_by: profile.id,
  }).eq("id", invoice.id);
  if (updateError) return errorState(`Email sent, but invoice status could not be updated: ${updateError.message}`);
  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "outgoing_invoice_sent",
    entity_type: "outgoing_invoice",
    entity_id: invoice.id,
    metadata: { invoice_number: invoice.invoice_number },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return { status: "success", message: "Invoice sent to the billing recipient.", fieldErrors: {} };
}

export async function markOutgoingInvoicePaidAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = paidSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    paidDate: formData.get("paidDate"),
    paidAmount: formData.get("paidAmount"),
    paymentReference: formData.get("paymentReference"),
    internalNote: formData.get("internalNote"),
  });
  if (!parsed.success) return { status: "error", message: "Check the payment details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("outgoing_invoices").select("id,status").eq("id", parsed.data.invoiceId).maybeSingle<{ id: string; status: string }>();
  if (!invoice) return errorState("Outgoing invoice not found.");
  if (!["sent", "overdue"].includes(invoice.status)) return errorState("Only sent or overdue invoices can be marked paid.");
  const { error } = await supabase.from("outgoing_invoices").update({
    status: "paid",
    paid_at: `${parsed.data.paidDate}T00:00:00.000Z`,
    paid_amount: parsed.data.paidAmount,
    payment_reference: parsed.data.paymentReference,
    internal_note: parsed.data.internalNote,
    paid_by: profile.id,
  }).eq("id", invoice.id);
  if (error) return errorState(`Could not mark invoice paid: ${error.message}`);
  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "outgoing_invoice_paid",
    entity_type: "outgoing_invoice",
    entity_id: invoice.id,
    metadata: { paid_amount: parsed.data.paidAmount, paid_date: parsed.data.paidDate },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return { status: "success", message: "Outgoing invoice marked as paid.", fieldErrors: {} };
}

async function reopenCancelledDraftInvoice(profileId: string, invoiceId: string) {
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("outgoing_invoices")
    .select("id,status,sent_at,cancellation_reason")
    .eq("id", invoiceId)
    .maybeSingle<{
      id: string;
      status: string;
      sent_at: string | null;
      cancellation_reason: string | null;
    }>();
  if (!invoice) return errorState("Outgoing invoice not found.");
  if (invoice.status !== "cancelled") return errorState("Only cancelled invoices can be reopened to draft.");
  if (invoice.sent_at) {
    return errorState("A previously sent invoice cannot be reopened to draft.");
  }
  if (invoice.cancellation_reason) {
    return errorState(
      "This cancelled invoice should stay immutable. Create a replacement draft instead.",
    );
  }
  const { error } = await supabase.from("outgoing_invoices").update({ status: "draft" }).eq("id", invoice.id);
  if (error) return errorState(`Could not update invoice status: ${error.message}`);
  await supabase.from("audit_logs").insert({
    actor_profile_id: profileId,
    action: "outgoing_invoice_reopened",
    entity_type: "outgoing_invoice",
    entity_id: invoice.id,
    metadata: { from_status: invoice.status, to_status: "draft" },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return { status: "success" as const, message: "Invoice reopened to draft.", fieldErrors: {} };
}

export async function cancelOutgoingInvoiceAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = cancelSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    cancellationReason: formData.get("cancellationReason"),
  });
  if (!parsed.success) return errorState("Invoice is missing.");

  const supabase = await createClient();
  const invoice = await getOutgoingInvoiceById(parsed.data.invoiceId);
  if (!invoice) return errorState("Outgoing invoice not found.");
  if (invoice.status === "paid") return errorState("Paid invoices cannot be cancelled.");
  if (invoice.status === "cancelled") return errorState("This invoice is already cancelled.");

  const cancellationRequiresEmail = invoice.email_status === "sent";
  const cancelledAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("outgoing_invoices")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      cancelled_by: profile.id,
      cancellation_reason: parsed.data.cancellationReason,
      cancellation_email_status: cancellationRequiresEmail ? "failed" : "not_required",
      cancellation_emailed_at: null,
    })
    .eq("id", invoice.id);
  if (updateError) return errorState(`Could not cancel invoice: ${updateError.message}`);

  let cancellationEmailStatus: "not_required" | "sent" | "failed" =
    cancellationRequiresEmail ? "failed" : "not_required";
  if (cancellationRequiresEmail) {
    try {
      const email = buildOutgoingInvoiceCancellationEmail({
        invoiceNumber: invoice.invoice_number,
        consultantName: invoice.consultant_name,
        monthLabel: outgoingInvoicePeriodLabel(invoice),
        projectName: invoice.project_name,
        reason: parsed.data.cancellationReason,
      });
      await sendPortalEmail({
        to: invoice.billing_email,
        cc: invoice.billing_cc_emails,
        ...email,
      });
      cancellationEmailStatus = "sent";
    } catch (error) {
      console.error("Outgoing invoice cancellation email failed", error);
      cancellationEmailStatus = "failed";
    }

    await supabase
      .from("outgoing_invoices")
      .update({
        cancellation_email_status: cancellationEmailStatus,
        cancellation_emailed_at:
          cancellationEmailStatus === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", invoice.id);
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "outgoing_invoice_cancelled",
    entity_type: "outgoing_invoice",
    entity_id: invoice.id,
    metadata: {
      from_status: invoice.status,
      to_status: "cancelled",
      invoice_number: invoice.invoice_number,
      cancellation_email_status: cancellationEmailStatus,
    },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return {
    status: "success",
    message:
      cancellationEmailStatus === "failed"
        ? "Invoice cancelled, but the client cancellation email failed. Check the cancellation email status."
        : "Invoice cancelled.",
    fieldErrors: {},
  };
}

export async function reopenOutgoingInvoiceAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = invoiceIdSchema.safeParse({ invoiceId: formData.get("invoiceId") });
  return parsed.success ? reopenCancelledDraftInvoice(profile.id, parsed.data.invoiceId) : errorState("Invoice is missing.");
}

export async function createReplacementOutgoingInvoiceDraftAction(
  _state: OutgoingInvoiceActionState,
  formData: FormData,
): Promise<OutgoingInvoiceActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = invoiceIdSchema.safeParse({ invoiceId: formData.get("invoiceId") });
  if (!parsed.success) return errorState("Invoice is missing.");

  const supabase = await createClient();
  const original = await getOutgoingInvoiceById(parsed.data.invoiceId);
  if (!original) return errorState("Outgoing invoice not found.");
  if (original.status !== "cancelled") return errorState("Only cancelled invoices can be replaced.");
  if (original.replaced_by_invoice_id) return errorState("This invoice already has a replacement draft.");

  const invoiceDate = new Date().toISOString().slice(0, 10);
  const dueDate = addThirtyDays(invoiceDate);
  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_outgoing_invoice_number",
    { invoice_year: Number(invoiceDate.slice(0, 4)) },
  );
  if (numberError || !invoiceNumber) {
    return errorState(`Could not allocate replacement invoice number: ${numberError?.message ?? "Unknown error"}`);
  }

  const replacementId = crypto.randomUUID();
  const replacementPayload = {
    id: replacementId,
    invoice_source: original.invoice_source,
    period_label: original.period_label,
    timesheet_id: original.timesheet_id,
    project_id: original.project_id,
    contractor_id: original.contractor_id,
    invoice_number: String(invoiceNumber),
    invoice_number_manually_edited: false,
    invoice_number_edited_at: null,
    invoice_number_edited_by: null,
    previous_invoice_number: null,
    replaces_invoice_id: original.id,
    replaced_by_invoice_id: null,
    invoice_date: invoiceDate,
    due_date: dueDate,
    year: Number(invoiceDate.slice(0, 4)),
    month: original.month,
    status: "draft",
    currency: original.currency,
    company_legal_name: original.company_legal_name,
    company_trading_name: original.company_trading_name,
    company_address: original.company_address,
    company_address_line_1: original.company_address_line_1,
    company_address_line_2: original.company_address_line_2,
    company_city_region: original.company_city_region,
    company_country: original.company_country,
    company_vat_number: original.company_vat_number,
    company_bank_name: original.company_bank_name,
    company_bank_account_name: original.company_bank_account_name,
    company_iban: original.company_iban,
    company_swift_bic: original.company_swift_bic,
    company_invoice_notes: original.company_invoice_notes,
    billing_legal_name: original.billing_legal_name,
    billing_email: original.billing_email,
    billing_cc_emails: original.billing_cc_emails,
    billing_address: original.billing_address,
    billing_address_line_1: original.billing_address_line_1,
    billing_address_line_2: original.billing_address_line_2,
    billing_country: original.billing_country,
    billing_vat_number: original.billing_vat_number,
    po_reference: original.po_reference,
    billing_invoice_notes: original.billing_invoice_notes,
    project_name: original.project_name,
    consultant_name: original.consultant_name,
    consultant_email: original.consultant_email,
    quantity: original.quantity,
    unit_label: original.unit_label,
    sales_rate: original.sales_rate,
    net_amount: original.net_amount,
    vat_treatment: original.vat_treatment,
    vat_rate: original.vat_rate,
    vat_amount: original.vat_amount,
    gross_amount: original.gross_amount,
    pdf_file_path: null,
    pdf_file_name: null,
    email_status: "not_sent",
    cancellation_email_status: "not_required",
    cancellation_emailed_at: null,
    cancellation_reason: null,
    cancelled_at: null,
    cancelled_by: null,
    created_by: profile.id,
  };

  const { error: insertError } = await supabase.from("outgoing_invoices").insert(replacementPayload);
  if (insertError) return errorState(`Could not create replacement draft: ${insertError.message}`);

  const { error: lineError } = await supabase.from("outgoing_invoice_lines").insert(
    original.lines.map((line) => ({
      outgoing_invoice_id: replacementId,
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unit_label,
      unit_rate: line.unit_rate,
      net_amount: line.net_amount,
      sort_order: line.sort_order,
    })),
  );
  if (lineError) return errorState(`Replacement draft was created, but lines could not be copied: ${lineError.message}`);

  try {
    await uploadOutgoingInvoicePdf(supabase, replacementId);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? `Replacement draft created, but PDF generation failed: ${error.message}`
        : "Replacement draft created, but PDF generation failed.",
    );
  }

  await supabase.from("outgoing_invoices").update({ replaced_by_invoice_id: replacementId }).eq("id", original.id);
  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "outgoing_invoice_replacement_draft_created",
    entity_type: "outgoing_invoice",
    entity_id: replacementId,
    metadata: {
      replaces_invoice_id: original.id,
      previous_invoice_number: original.invoice_number,
      replacement_invoice_number: invoiceNumber,
    },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${original.id}`);
  revalidatePath(`/outgoing-invoices/${replacementId}`);
  return {
    status: "success",
    message: `Replacement draft created with invoice number ${invoiceNumber}.`,
    fieldErrors: {},
  };
}
