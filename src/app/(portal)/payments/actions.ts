"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { sendAdminNotification, sendContractorNotification } from "@/lib/email/notifications";
import { buildNotificationEmail, getPortalBaseUrl } from "@/lib/email/portal-email";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceStatus } from "@/lib/invoices/types";

const optionalText = z
  .string()
  .trim()
  .max(500, "Keep this field under 500 characters.")
  .transform((value) => (value.length > 0 ? value : null));

const optionalShortText = z
  .string()
  .trim()
  .max(120, "Keep the reference under 120 characters.")
  .transform((value) => (value.length > 0 ? value : null));

const optionalDate = z
  .string()
  .trim()
  .transform((value, context) => {
    if (!value) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid payment date.",
      });
      return z.NEVER;
    }

    return value;
  });

const optionalMoney = z
  .string()
  .trim()
  .transform((value, context) => {
    if (!value) {
      return null;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid non-negative amount.",
      });
      return z.NEVER;
    }

    return amount.toFixed(2);
  });

const paymentStatusSchema = z.object({
  invoiceId: z.string().uuid("Select a valid invoice."),
  status: z.enum(["pending", "approved", "paid", "on_hold"], {
    message: "Select a valid payment status.",
  }),
  paymentDate: optionalDate,
  paymentReference: optionalShortText,
  paidAmount: optionalMoney,
  internalNote: optionalText,
});

export type PaymentActionState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

const invoiceStatusByPaymentStatus: Record<
  z.infer<typeof paymentStatusSchema>["status"],
  InvoiceStatus
> = {
  pending: "uploaded",
  approved: "approved_for_payment",
  paid: "paid",
  on_hold: "on_hold",
};

function formatInvoiceMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function updatePaymentStatusAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = paymentStatusSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    status: formData.get("status"),
    paymentDate: formData.get("paymentDate"),
    paymentReference: formData.get("paymentReference"),
    paidAmount: formData.get("paidAmount"),
    internalNote: formData.get("internalNote"),
  });

  if (!parsed.success) {
    return {
      message: "Check the payment details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (parsed.data.status === "paid") {
    const fieldErrors: PaymentActionState["fieldErrors"] = {};

    if (!parsed.data.paymentDate) {
      fieldErrors.paymentDate = ["Enter the payment date before marking paid."];
    }

    if (!parsed.data.paidAmount) {
      fieldErrors.paidAmount = ["Enter the paid amount before marking paid."];
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        message: "Paid invoices need a payment date and paid amount.",
        status: "error",
        fieldErrors,
      };
    }
  }

  const supabase = await createClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id,status,currency,contractor_id,invoice_number,invoice_date,payment_statement_id")
    .eq("id", parsed.data.invoiceId)
    .maybeSingle<{
      id: string;
      status: InvoiceStatus;
      currency: string;
      contractor_id: string;
      invoice_number: string;
      invoice_date: string;
      payment_statement_id: string | null;
    }>();

  if (invoiceError || !invoice) {
    return {
      message: "Select an existing invoice before recording payment status.",
      status: "error",
      fieldErrors: {
        invoiceId: ["Select an existing invoice."],
      },
    };
  }

  if (invoice.status === "cancelled") {
    return {
      message: "Cancelled invoices cannot receive payment updates.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id,status")
    .eq("invoice_id", invoice.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (existingPaymentError) {
    return {
      message: `Could not check existing payment status: ${existingPaymentError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const paymentPayload = {
    invoice_id: invoice.id,
    status: parsed.data.status,
    payment_date: parsed.data.paymentDate,
    payment_reference: parsed.data.paymentReference,
    paid_amount: parsed.data.paidAmount,
    currency: invoice.currency,
    internal_note: parsed.data.internalNote,
  };

  const paymentResult = existingPayment
    ? await supabase
        .from("payments")
        .update(paymentPayload)
        .eq("id", existingPayment.id)
        .select("id")
        .single<{ id: string }>()
    : await supabase
        .from("payments")
        .insert(paymentPayload)
        .select("id")
        .single<{ id: string }>();

  if (paymentResult.error || !paymentResult.data) {
    return {
      message: `Could not save the payment status: ${
        paymentResult.error?.message ?? "Unknown error"
      }`,
      status: "error",
      fieldErrors: {},
    };
  }

  const nextInvoiceStatus = invoiceStatusByPaymentStatus[parsed.data.status];
  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({
      status: nextInvoiceStatus,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      review_comment:
        parsed.data.status === "paid"
          ? "Payment marked as paid manually."
          : parsed.data.internalNote,
    })
    .eq("id", invoice.id);

  if (invoiceUpdateError) {
    return {
      message: `Payment status saved, but invoice status could not be updated: ${invoiceUpdateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "payment_status_updated",
    entity_type: "payment",
    entity_id: paymentResult.data.id,
    metadata: {
      invoice_id: invoice.id,
      from_payment_status: existingPayment?.status ?? null,
      to_payment_status: parsed.data.status,
      from_invoice_status: invoice.status,
      to_invoice_status: nextInvoiceStatus,
    },
  });

  if (auditError) {
    return {
      message: `Payment status saved, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  if (["paid", "on_hold"].includes(parsed.data.status)) {
    const [{ data: contractor }, { data: statement }] = await Promise.all([
      supabase
        .from("contractors")
        .select("legal_name,email")
        .eq("id", invoice.contractor_id)
        .maybeSingle<{ legal_name: string; email: string }>(),
      invoice.payment_statement_id
        ? supabase
            .from("payment_statements")
            .select("projects(name)")
            .eq("id", invoice.payment_statement_id)
            .maybeSingle<{ projects: { name: string }[] | { name: string } | null }>()
        : Promise.resolve({ data: null }),
    ]);

    if (contractor) {
      const monthLabel = formatInvoiceMonth(invoice.invoice_date);
      await sendContractorNotification({
        to: contractor.email,
        subject:
          parsed.data.status === "paid"
            ? `Payment marked paid - ${invoice.invoice_number} - ${monthLabel}`
            : `Payment put on hold - ${invoice.invoice_number} - ${monthLabel}`,
        body:
          parsed.data.status === "paid"
            ? `Payment for invoice ${invoice.invoice_number} for ${monthLabel} has been marked as paid in the ANVEL Contractor Portal.`
            : `Payment for invoice ${invoice.invoice_number} for ${monthLabel} has been put on hold while ANVEL reviews it.`,
      });

      const requestHeaders = await headers();
      const baseUrl = getPortalBaseUrl(requestHeaders.get("origin"));
      const project = Array.isArray(statement?.projects)
        ? (statement?.projects[0] ?? null)
        : (statement?.projects ?? null);

      await sendAdminNotification(
        buildNotificationEmail(
          parsed.data.status === "paid"
            ? `Payment marked paid - ${invoice.invoice_number} - ${monthLabel}`
            : `Payment put on hold - ${invoice.invoice_number} - ${monthLabel}`,
          [
            `Contractor: ${contractor.legal_name}`,
            `Email: ${contractor.email}`,
            `Invoice: ${invoice.invoice_number}`,
            `Month: ${monthLabel}`,
            `Project: ${project?.name ?? "Not set"}`,
            `Status: ${parsed.data.status}`,
            `Review link: ${baseUrl}/contractors/${invoice.contractor_id}/payments`,
          ].join("\n"),
        ),
      );
    }
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/exports");
  revalidatePath(`/contractors/${invoice.contractor_id}/payments`);
  revalidatePath(`/contractors/${invoice.contractor_id}/invoices`);

  return {
    message: "Payment status saved.",
    status: "success",
    fieldErrors: {},
  };
}

export async function markInvoicePaidAction(formData: FormData) {
  const invoiceId = formData.get("invoiceId");
  const paidAmount = formData.get("paidAmount");
  const paymentDate = new Date().toISOString().slice(0, 10);
  const nextFormData = new FormData();

  nextFormData.set("invoiceId", String(invoiceId ?? ""));
  nextFormData.set("status", "paid");
  nextFormData.set("paymentDate", paymentDate);
  nextFormData.set("paidAmount", String(paidAmount ?? ""));
  nextFormData.set("paymentReference", "");
  nextFormData.set("internalNote", "Marked as paid from the payments list.");

  await updatePaymentStatusAction(
    {
      message: null,
      status: "idle",
      fieldErrors: {},
    },
    nextFormData,
  );
}
