"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { buildOutgoingInvoiceEmail, sendPortalEmail } from "@/lib/email/portal-email";
import { formatTimesheetMonth } from "@/lib/timesheets/format";
import { createClient } from "@/lib/supabase/server";
import { getOutgoingInvoiceById } from "@/lib/outgoing-invoices/queries";
import { createOutgoingInvoicePdf } from "@/lib/outgoing-invoices/pdf";

const invoiceIdSchema = z.object({
  invoiceId: z.string().uuid("Invoice is missing."),
});
const paidSchema = invoiceIdSchema.extend({
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a paid date."),
  paidAmount: z.coerce.number().nonnegative("Paid amount cannot be negative."),
  paymentReference: z.string().trim().max(200).transform((value) => value || null),
  internalNote: z.string().trim().max(1000).transform((value) => value || null),
});

export type OutgoingInvoiceActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string[] | undefined>;
};

function errorState(message: string): OutgoingInvoiceActionState {
  return { status: "error", message, fieldErrors: {} };
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

  const pdf = createOutgoingInvoicePdf(invoice);
  const fileName = `${invoice.invoice_number.toLowerCase()}.pdf`;
  const filePath = `invoices/${invoice.id}/${fileName}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("outgoing-invoices")
    .upload(filePath, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
  if (error) return errorState(`Could not regenerate PDF: ${error.message}`);
  await supabase.from("outgoing_invoices").update({ pdf_file_path: filePath, pdf_file_name: fileName }).eq("id", invoice.id);
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return { status: "success", message: "Invoice PDF regenerated.", fieldErrors: {} };
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
      monthLabel: formatTimesheetMonth(invoice.year, invoice.month),
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

async function setDraftOrCancelled(
  profileId: string,
  invoiceId: string,
  nextStatus: "draft" | "cancelled",
) {
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
  if (nextStatus === "cancelled" && invoice.status === "paid") return errorState("Paid invoices cannot be cancelled.");
  if (nextStatus === "draft" && invoice.status !== "cancelled") return errorState("Only cancelled invoices can be reopened to draft.");
  if (nextStatus === "draft" && invoice.sent_at) {
    return errorState("A previously sent invoice cannot be reopened to draft.");
  }
  if (nextStatus === "draft" && invoice.cancellation_reason) {
    return errorState(
      "An invoice cancelled after a timesheet reopen cannot be restored. Approve the corrected timesheet to create a replacement.",
    );
  }
  const { error } = await supabase.from("outgoing_invoices").update({ status: nextStatus }).eq("id", invoice.id);
  if (error) return errorState(`Could not update invoice status: ${error.message}`);
  await supabase.from("audit_logs").insert({
    actor_profile_id: profileId,
    action: nextStatus === "draft" ? "outgoing_invoice_reopened" : "outgoing_invoice_cancelled",
    entity_type: "outgoing_invoice",
    entity_id: invoice.id,
    metadata: { from_status: invoice.status, to_status: nextStatus },
  });
  revalidatePath("/outgoing-invoices");
  revalidatePath(`/outgoing-invoices/${invoice.id}`);
  return { status: "success" as const, message: nextStatus === "draft" ? "Invoice reopened to draft." : "Invoice cancelled.", fieldErrors: {} };
}

export async function cancelOutgoingInvoiceAction(_state: OutgoingInvoiceActionState, formData: FormData) {
  const profile = await requireRole(["admin"]);
  const parsed = invoiceIdSchema.safeParse({ invoiceId: formData.get("invoiceId") });
  return parsed.success ? setDraftOrCancelled(profile.id, parsed.data.invoiceId, "cancelled") : errorState("Invoice is missing.");
}

export async function reopenOutgoingInvoiceAction(_state: OutgoingInvoiceActionState, formData: FormData) {
  const profile = await requireRole(["admin"]);
  const parsed = invoiceIdSchema.safeParse({ invoiceId: formData.get("invoiceId") });
  return parsed.success ? setDraftOrCancelled(profile.id, parsed.data.invoiceId, "draft") : errorState("Invoice is missing.");
}
