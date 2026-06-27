"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireCurrentProfile, requireRole } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import type { SupplierType } from "@/lib/contractors/types";
import type { DocumentStatus } from "@/lib/documents/types";
import { normaliseDocumentType } from "@/lib/documents/requirements";
import { sendAdminNotification } from "@/lib/email/notifications";
import {
  buildDocumentUploadedAdminEmail,
  getPortalBaseUrl,
} from "@/lib/email/portal-email";
import { createClient } from "@/lib/supabase/server";

const maxDocumentSizeBytes = 10 * 1024 * 1024;
const documentBucket = "contractor-documents";

const uploadSchema = z.object({
  documentRequirementId: z.string().uuid("Select a document requirement."),
  contractorId: z.string().uuid("Select a contractor.").optional(),
});

const reviewSchema = z.object({
  documentId: z.string().uuid("Select a valid document."),
  status: z.enum(["uploaded", "approved", "rejected", "expired"], {
    message: "Select a valid document review status.",
  }),
  reviewComment: z
    .string()
    .trim()
    .max(500, "Keep the review comment under 500 characters.")
    .transform((value) => (value.length > 0 ? value : null)),
});

export type DocumentUploadState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: {
    documentRequirementId?: string[];
    contractorId?: string[];
    file?: string[];
  };
};

export type DocumentReviewState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: {
    documentId?: string[];
    status?: string[];
    reviewComment?: string[];
  };
};

type RequirementForUpload = {
  id: string;
  name: string;
  supplier_type: SupplierType | null;
};

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
  const profile = await requireCurrentProfile();
  const parsed = uploadSchema.safeParse({
    documentRequirementId: formData.get("documentRequirementId"),
    contractorId:
      profile.role === "admin" ? formData.get("contractorId") : undefined,
  });

  if (profile.role === "operations") {
    return {
      message: "Your role cannot upload contractor documents.",
      status: "error",
      fieldErrors: {},
    };
  }

  const supabase = await createClient();
  const contractor =
    profile.role === "contractor"
      ? await getContractorByProfileId(profile.id)
      : parsed.success && parsed.data.contractorId
        ? await supabase
            .from("contractors")
            .select("id,supplier_type,legal_name,email")
            .eq("id", parsed.data.contractorId)
            .maybeSingle<{
              id: string;
              supplier_type: SupplierType | null;
              legal_name: string;
              email: string;
            }>()
            .then((result) => result.data)
        : null;

  if (!contractor) {
    return {
      message:
        profile.role === "contractor"
          ? "Your account is not linked to a contractor profile."
          : "Select a contractor before uploading a document.",
      status: "error",
      fieldErrors: {
        contractorId:
          profile.role === "admin" ? ["Select a contractor."] : undefined,
      },
    };
  }

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
        contractorId: fieldErrors.contractorId,
        file: fileValidation.error ? [fileValidation.error] : undefined,
      },
    };
  }

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

  if (profile.role === "admin") {
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_profile_id: profile.id,
      action: "contractor_document_uploaded_by_admin",
      entity_type: "contractor_document",
      entity_id: documentId,
      metadata: {
        contractor_id: contractor.id,
        document_requirement_id: requirement.id,
      },
    });

    if (auditError) {
      return {
        message: `Document uploaded, but audit logging failed: ${auditError.message}`,
        status: "error",
        fieldErrors: {},
      };
    }
  }

  if (profile.role === "contractor") {
    const requestHeaders = await headers();
    const baseUrl = getPortalBaseUrl(requestHeaders.get("origin"));
    await sendAdminNotification(
      buildDocumentUploadedAdminEmail({
        contractorName: contractor.legal_name,
        contractorEmail: contractor.email,
        documentName: requirement.name,
        uploadDate: new Date().toISOString().slice(0, 10),
        reviewLink: `${baseUrl}/contractors/${contractor.id}/documents`,
      }),
    );
  }

  revalidatePath("/documents");
  revalidatePath(`/contractors/${contractor.id}`);
  revalidatePath(`/contractors/${contractor.id}/documents`);

  return {
    message: "Document uploaded for review.",
    status: "success",
    fieldErrors: {},
  };
}

export async function reviewContractorDocumentAction(
  _previousState: DocumentReviewState,
  formData: FormData,
): Promise<DocumentReviewState> {
  const profile = await requireRole(["admin"]);
  const parsed = reviewSchema.safeParse({
    documentId: formData.get("documentId"),
    status: formData.get("status"),
    reviewComment: formData.get("reviewComment"),
  });

  if (!parsed.success) {
    return {
      message: "Check the document review details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (parsed.data.status === "rejected" && !parsed.data.reviewComment) {
    return {
      message: "Rejected documents need a review comment.",
      status: "error",
      fieldErrors: {
        reviewComment: ["Enter the rejection reason."],
      },
    };
  }

  const supabase = await createClient();
  const { data: document, error: documentError } = await supabase
    .from("contractor_documents")
    .select("id,status,contractor_id")
    .eq("id", parsed.data.documentId)
    .maybeSingle<{ id: string; status: DocumentStatus; contractor_id: string }>();

  if (documentError || !document) {
    return {
      message: "Select an existing document before saving a review.",
      status: "error",
      fieldErrors: {
        documentId: ["Select an existing document."],
      },
    };
  }

  const { error: updateError } = await supabase
    .from("contractor_documents")
    .update({
      status: parsed.data.status,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      review_comment: parsed.data.reviewComment,
    })
    .eq("id", document.id);

  if (updateError) {
    return {
      message: `Could not update the document review: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_document_review_updated",
    entity_type: "contractor_document",
    entity_id: document.id,
    metadata: {
      from_status: document.status,
      to_status: parsed.data.status,
    },
  });

  if (auditError) {
    return {
      message: `Document review saved, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/documents");
  revalidatePath(`/contractors/${document.contractor_id}/documents`);
  revalidatePath(`/contractors/${document.contractor_id}`);
  revalidatePath("/");

  return {
    message: "Document review saved.",
    status: "success",
    fieldErrors: {},
  };
}
