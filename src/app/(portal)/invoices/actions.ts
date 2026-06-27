"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { sendAdminNotification, sendContractorNotification } from "@/lib/email/notifications";
import {
  buildInvoiceUploadedAdminEmail,
  getPortalBaseUrl,
} from "@/lib/email/portal-email";
import type { InvoiceStatus } from "@/lib/invoices/types";
import { createClient } from "@/lib/supabase/server";

const invoiceBucket = "contractor-invoices";
const maxInvoiceSizeBytes = 10 * 1024 * 1024;

const uploadInvoiceSchema = z.object({
  paymentStatementId: z.string().uuid("Select a payment statement."),
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Enter the invoice number.")
    .max(80, "Invoice number is too long."),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid invoice date."),
});

const reviewInvoiceSchema = z.object({
  invoiceId: z.string().uuid("Select a valid invoice."),
  status: z.enum(
    ["uploaded", "checked", "correction_required", "approved_for_payment", "on_hold"],
    {
      message: "Select a valid invoice review status.",
    },
  ),
  reviewComment: z
    .string()
    .trim()
    .max(500, "Keep the review comment under 500 characters.")
    .transform((value) => (value.length > 0 ? value : null)),
});

export type InvoiceUploadState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: {
    paymentStatementId?: string[];
    invoiceNumber?: string[];
    invoiceDate?: string[];
    file?: string[];
  };
};

export type InvoiceReviewState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: {
    invoiceId?: string[];
    status?: string[];
    reviewComment?: string[];
  };
};

type StatementForInvoiceUpload = {
  id: string;
  timesheet_id: string;
  contractor_id: string;
  project_id: string;
  net_amount: number | string;
  vat_amount: number | string;
  gross_amount: number | string;
  currency: string;
};

function safeFileName(value: string) {
  const withoutExtension = value.replace(/\.pdf$/i, "");
  const safeBaseName = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBaseName || "invoice"}.pdf`;
}

function validateFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return {
      file: null,
      error: "Select the official invoice PDF.",
    };
  }

  if (value.size > maxInvoiceSizeBytes) {
    return {
      file: null,
      error: "PDF files must be 10 MB or smaller.",
    };
  }

  if (value.type !== "application/pdf" || !value.name.toLowerCase().endsWith(".pdf")) {
    return {
      file: null,
      error: "Only PDF files are accepted.",
    };
  }

  return {
    file: value,
    error: null,
  };
}

function parseInvoiceDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatInvoiceMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function uploadContractorInvoiceAction(
  _previousState: InvoiceUploadState,
  formData: FormData,
): Promise<InvoiceUploadState> {
  const profile = await requireRole(["contractor"]);
  const contractor = await getContractorByProfileId(profile.id);

  if (!contractor) {
    return {
      message: "Your account is not linked to a contractor profile.",
      status: "error",
      fieldErrors: {},
    };
  }

  const parsed = uploadInvoiceSchema.safeParse({
    paymentStatementId: formData.get("paymentStatementId"),
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
  });
  const fileValidation = validateFile(formData.get("file"));

  if (!parsed.success || fileValidation.error || !fileValidation.file) {
    const fieldErrors = parsed.success
      ? {}
      : parsed.error.flatten().fieldErrors;

    return {
      message: "Check the invoice details and try again.",
      status: "error",
      fieldErrors: {
        paymentStatementId: fieldErrors.paymentStatementId,
        invoiceNumber: fieldErrors.invoiceNumber,
        invoiceDate: fieldErrors.invoiceDate,
        file: fileValidation.error ? [fileValidation.error] : undefined,
      },
    };
  }

  if (!parseInvoiceDate(parsed.data.invoiceDate)) {
    return {
      message: "Check the invoice details and try again.",
      status: "error",
      fieldErrors: {
        invoiceDate: ["Enter a valid invoice date."],
      },
    };
  }

  const supabase = await createClient();
  const { data: statement, error: statementError } = await supabase
    .from("payment_statements")
    .select("id,timesheet_id,contractor_id,project_id,net_amount,vat_amount,gross_amount,currency")
    .eq("id", parsed.data.paymentStatementId)
    .maybeSingle<StatementForInvoiceUpload>();

  if (statementError || !statement || statement.contractor_id !== contractor.id) {
    return {
      message: "Select a payment statement linked to your contractor profile.",
      status: "error",
      fieldErrors: {
        paymentStatementId: ["Select one of your payment statements."],
      },
    };
  }

  const { data: existingInvoice, error: existingError } = await supabase
    .from("invoices")
    .select("id")
    .eq("payment_statement_id", statement.id)
    .eq("invoice_type", "contractor_uploaded")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    return {
      message: `Could not check existing invoices: ${existingError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  if (existingInvoice) {
    return {
      message: "An invoice has already been uploaded for this payment statement.",
      status: "error",
      fieldErrors: {},
    };
  }

  const invoiceId = crypto.randomUUID();
  const fileName = safeFileName(fileValidation.file.name);
  const filePath = `contractors/${contractor.id}/invoices/${invoiceId}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(invoiceBucket)
    .upload(filePath, fileValidation.file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return {
      message: `Could not upload the invoice PDF: ${uploadError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: insertError } = await supabase.from("invoices").insert({
    id: invoiceId,
    payment_statement_id: statement.id,
    timesheet_id: statement.timesheet_id,
    contractor_id: contractor.id,
    invoice_type: "contractor_uploaded",
    invoice_number: parsed.data.invoiceNumber,
    invoice_date: parsed.data.invoiceDate,
    net_amount: statement.net_amount,
    vat_amount: statement.vat_amount,
    gross_amount: statement.gross_amount,
    currency: statement.currency,
    file_path: filePath,
    file_name: fileName,
    status: "uploaded",
  });

  if (insertError) {
    await supabase.storage.from(invoiceBucket).remove([filePath]);

    return {
      message: `The PDF was uploaded but invoice metadata could not be saved: ${insertError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", statement.project_id)
    .maybeSingle<{ name: string }>();

  const requestHeaders = await headers();
  const baseUrl = getPortalBaseUrl(requestHeaders.get("origin"));
  await sendAdminNotification(
    buildInvoiceUploadedAdminEmail({
      contractorName: contractor.legal_name,
      contractorEmail: contractor.email,
      invoiceNumber: parsed.data.invoiceNumber,
      monthLabel: formatInvoiceMonth(parsed.data.invoiceDate),
      projectName: project?.name ?? null,
      reviewLink: `${baseUrl}/contractors/${contractor.id}/invoices`,
    }),
  );

  revalidatePath("/invoices");
  revalidatePath("/timesheets");
  revalidatePath(`/contractors/${contractor.id}/invoices`);

  return {
    message: "Invoice uploaded for review.",
    status: "success",
    fieldErrors: {},
  };
}

export async function reviewInvoiceAction(
  _previousState: InvoiceReviewState,
  formData: FormData,
): Promise<InvoiceReviewState> {
  const profile = await requireRole(["admin"]);
  const parsed = reviewInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    status: formData.get("status"),
    reviewComment: formData.get("reviewComment"),
  });

  if (!parsed.success) {
    return {
      message: "Check the invoice review details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (
    parsed.data.status === "correction_required" &&
    !parsed.data.reviewComment
  ) {
    return {
      message: "Correction required needs a reason for the contractor.",
      status: "error",
      fieldErrors: {
        reviewComment: ["Enter the correction reason."],
      },
    };
  }

  const supabase = await createClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id,status,contractor_id,invoice_number,invoice_date")
    .eq("id", parsed.data.invoiceId)
    .maybeSingle<{
      id: string;
      status: InvoiceStatus;
      contractor_id: string;
      invoice_number: string;
      invoice_date: string;
    }>();

  if (invoiceError || !invoice) {
    return {
      message: "Select an existing invoice before saving a review.",
      status: "error",
      fieldErrors: {
        invoiceId: ["Select an existing invoice."],
      },
    };
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: parsed.data.status,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      review_comment: parsed.data.reviewComment,
    })
    .eq("id", invoice.id);

  if (updateError) {
    return {
      message: `Could not update the invoice review: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "invoice_review_updated",
    entity_type: "invoice",
    entity_id: invoice.id,
    metadata: {
      from_status: invoice.status,
      to_status: parsed.data.status,
    },
  });

  if (auditError) {
    return {
      message: `Invoice review saved, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { data: contractor } = await supabase
    .from("contractors")
    .select("email")
    .eq("id", invoice.contractor_id)
    .maybeSingle<{ email: string }>();

  if (
    contractor &&
    ["approved_for_payment", "correction_required", "on_hold"].includes(
      parsed.data.status,
    )
  ) {
    const monthLabel = formatInvoiceMonth(invoice.invoice_date);
    await sendContractorNotification({
      to: contractor.email,
      subject:
        parsed.data.status === "approved_for_payment"
          ? `Invoice approved for payment - ${invoice.invoice_number} - ${monthLabel}`
          : parsed.data.status === "on_hold"
            ? `Invoice put on hold - ${invoice.invoice_number} - ${monthLabel}`
            : `Invoice correction required - ${invoice.invoice_number} - ${monthLabel}`,
      body:
        parsed.data.status === "correction_required"
          ? `Your invoice ${invoice.invoice_number} for ${monthLabel} needs correction. Status: ${parsed.data.status}. Reason: ${parsed.data.reviewComment}`
          : parsed.data.status === "on_hold"
            ? `Your invoice ${invoice.invoice_number} for ${monthLabel} has been put on hold while ANVEL reviews it.`
            : `Your invoice ${invoice.invoice_number} for ${monthLabel} has been approved for payment tracking.`,
    });
  }

  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/exports");
  revalidatePath(`/contractors/${invoice.contractor_id}/invoices`);
  revalidatePath(`/contractors/${invoice.contractor_id}/payments`);

  return {
    message: "Invoice review saved.",
    status: "success",
    fieldErrors: {},
  };
}
