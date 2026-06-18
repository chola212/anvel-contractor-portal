"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import type { SupplierType } from "@/lib/contractors/types";
import { createClient } from "@/lib/supabase/server";

const maxDocumentSizeBytes = 10 * 1024 * 1024;
const documentBucket = "contractor-documents";

const uploadSchema = z.object({
  documentRequirementId: z.string().uuid("Select a document requirement."),
});

export type DocumentUploadState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: {
    documentRequirementId?: string[];
    file?: string[];
  };
};

type RequirementForUpload = {
  id: string;
  name: string;
  supplier_type: SupplierType | null;
};

function normaliseDocumentType(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function safeFileName(value: string) {
  const withoutExtension = value.replace(/\.pdf$/i, "");
  const safeBaseName = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBaseName || "document"}.pdf`;
}

function validateFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return {
      file: null,
      error: "Select a PDF file to upload.",
    };
  }

  if (value.size > maxDocumentSizeBytes) {
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

export async function uploadContractorDocumentAction(
  _previousState: DocumentUploadState,
  formData: FormData,
): Promise<DocumentUploadState> {
  const profile = await requireRole(["contractor"]);
  const contractor = await getContractorByProfileId(profile.id);

  if (!contractor) {
    return {
      message: "Your account is not linked to a contractor profile.",
      status: "error",
      fieldErrors: {},
    };
  }

  const parsed = uploadSchema.safeParse({
    documentRequirementId: formData.get("documentRequirementId"),
  });
  const fileValidation = validateFile(formData.get("file"));

  if (!parsed.success || fileValidation.error || !fileValidation.file) {
    const fieldErrors = parsed.success
      ? {}
      : parsed.error.flatten().fieldErrors;

    return {
      message: "Check the upload details and try again.",
      status: "error",
      fieldErrors: {
        documentRequirementId: fieldErrors.documentRequirementId,
        file: fileValidation.error ? [fileValidation.error] : undefined,
      },
    };
  }

  const supabase = await createClient();
  const { data: requirement, error: requirementError } = await supabase
    .from("document_requirements")
    .select("id,name,supplier_type")
    .eq("id", parsed.data.documentRequirementId)
    .maybeSingle<RequirementForUpload>();

  if (requirementError || !requirement) {
    return {
      message: "The selected document requirement could not be found.",
      status: "error",
      fieldErrors: {
        documentRequirementId: ["Select a valid document requirement."],
      },
    };
  }

  if (
    requirement.supplier_type &&
    requirement.supplier_type !== contractor.supplier_type
  ) {
    return {
      message: "This document requirement does not apply to your contractor profile.",
      status: "error",
      fieldErrors: {
        documentRequirementId: ["Select a requirement for your supplier type."],
      },
    };
  }

  const documentId = crypto.randomUUID();
  const fileName = safeFileName(fileValidation.file.name);
  const filePath = `contractors/${contractor.id}/documents/${documentId}-${fileName}`;
  const documentType = normaliseDocumentType(requirement.name) || "contractor_document";

  const { error: uploadError } = await supabase.storage
    .from(documentBucket)
    .upload(filePath, fileValidation.file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return {
      message: `Could not upload the PDF: ${uploadError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: insertError } = await supabase.from("contractor_documents").insert({
    id: documentId,
    contractor_id: contractor.id,
    document_requirement_id: requirement.id,
    document_type: documentType,
    file_path: filePath,
    file_name: fileName,
    mime_type: "application/pdf",
    file_size_bytes: fileValidation.file.size,
    status: "uploaded",
  });

  if (insertError) {
    await supabase.storage.from(documentBucket).remove([filePath]);

    return {
      message: `The PDF was uploaded but metadata could not be saved: ${insertError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/documents");

  return {
    message: "Document uploaded for review.",
    status: "success",
    fieldErrors: {},
  };
}
