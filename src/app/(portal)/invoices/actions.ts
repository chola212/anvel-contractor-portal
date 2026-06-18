"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { createClient } from "@/lib/supabase/server";

const invoiceBucket = "contractor-invoices";
const maxInvoiceSizeBytes = 10 * 1024 * 1024;

const uploadInvoiceSchema = z.object({
  paymentStatementId: z.string().uuid("Select a payment statement."),
  invoiceNumber: z
    .string()
    .trim()
    .min(2, "Enter the invoice number.")
    .max(80, "Invoice number is too long."),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid invoice date."),
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

type StatementForInvoiceUpload = {
  id: string;
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
    .select("id,contractor_id,project_id,net_amount,vat_amount,gross_amount,currency")
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
    contractor_id: contractor.id,
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

  revalidatePath("/invoices");
  revalidatePath("/timesheets");

  return {
    message: "Invoice uploaded for review.",
    status: "success",
    fieldErrors: {},
  };
}
