"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { validatePdfUploadFile } from "@/lib/files/pdf-upload";
import { projectDocumentTypes } from "@/lib/project-documents/types";
import { createClient } from "@/lib/supabase/server";

const projectDocumentBucket = "project-documents";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null,
  z.string().max(1000).nullable(),
);

const optionalShortText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null,
  z.string().max(160).nullable(),
);

const optionalUuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null,
  z.string().uuid("Select a valid contractor.").nullable(),
);

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null,
  z
    .string()
    .regex(datePattern, "Enter a valid date.")
    .nullable(),
);

const uploadProjectDocumentSchema = z.object({
  projectId: z.string().uuid("Select a project."),
  contractorId: optionalUuid,
  consultantName: optionalShortText,
  documentType: z.enum(projectDocumentTypes, {
    message: "Select a valid document type.",
  }),
  title: z
    .string()
    .trim()
    .min(1, "Enter a document title.")
    .max(200, "Keep the title under 200 characters."),
  documentDate: optionalDate,
  notes: optionalText,
});

const updateProjectDocumentSchema = uploadProjectDocumentSchema
  .omit({ projectId: true })
  .extend({
    documentId: z.string().uuid("Document is missing."),
    projectId: z.string().uuid("Project is missing."),
  });

const projectDocumentIdSchema = z.object({
  documentId: z.string().uuid("Document is missing."),
});

export type ProjectDocumentActionState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

type ProjectDocumentLookup = {
  id: string;
  project_id: string;
  contractor_id: string | null;
  consultant_name: string | null;
  document_type: string;
  title: string;
  document_date: string | null;
  file_path: string;
  file_name: string;
  status: string;
  notes: string | null;
};

function safeFileName(value: string) {
  const withoutExtension = value.replace(/\.pdf$/i, "");
  const safeBaseName = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBaseName || "project-document"}.pdf`;
}

async function ensureProjectExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle<{ id: string }>();

  return !error && Boolean(data);
}

async function ensureContractorExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractorId: string | null,
) {
  if (!contractorId) {
    return true;
  }

  const { data, error } = await supabase
    .from("contractors")
    .select("id")
    .eq("id", contractorId)
    .maybeSingle<{ id: string }>();

  return !error && Boolean(data);
}

function revalidateProjectDocumentPaths(projectId: string) {
  revalidatePath("/project-documents");
  revalidatePath(`/projects/${projectId}`);
}

export async function uploadProjectDocumentAction(
  _previousState: ProjectDocumentActionState,
  formData: FormData,
): Promise<ProjectDocumentActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = uploadProjectDocumentSchema.safeParse({
    projectId: formData.get("projectId"),
    contractorId: formData.get("contractorId"),
    consultantName: formData.get("consultantName"),
    documentType: formData.get("documentType"),
    title: formData.get("title"),
    documentDate: formData.get("documentDate"),
    notes: formData.get("notes"),
  });
  const fileValidation = await validatePdfUploadFile({
    value: formData.get("file"),
    emptyMessage: "Select a PDF file to upload.",
  });

  if (!parsed.success || fileValidation.error || !fileValidation.file) {
    const fieldErrors = parsed.success
      ? {}
      : parsed.error.flatten().fieldErrors;

    return {
      message: "Check the project document details and try again.",
      status: "error",
      fieldErrors: {
        ...fieldErrors,
        file: fileValidation.error ? [fileValidation.error] : undefined,
      },
    };
  }

  const supabase = await createClient();
  const [projectExists, contractorExists] = await Promise.all([
    ensureProjectExists(supabase, parsed.data.projectId),
    ensureContractorExists(supabase, parsed.data.contractorId),
  ]);

  if (!projectExists || !contractorExists) {
    return {
      message: "Check the selected project and contractor.",
      status: "error",
      fieldErrors: {
        projectId: projectExists ? undefined : ["Select an existing project."],
        contractorId: contractorExists
          ? undefined
          : ["Select an existing contractor."],
      },
    };
  }

  const documentId = crypto.randomUUID();
  const fileName = safeFileName(fileValidation.file.name);
  const filePath = `projects/${parsed.data.projectId}/documents/${documentId}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(projectDocumentBucket)
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

  const { error: insertError } = await supabase
    .from("project_documents")
    .insert({
      id: documentId,
      project_id: parsed.data.projectId,
      contractor_id: parsed.data.contractorId,
      consultant_name: parsed.data.consultantName,
      document_type: parsed.data.documentType,
      title: parsed.data.title,
      document_date: parsed.data.documentDate,
      file_path: filePath,
      file_name: fileName,
      mime_type: "application/pdf",
      file_size_bytes: fileValidation.file.size,
      status: "active",
      notes: parsed.data.notes,
      uploaded_by: profile.id,
    });

  if (insertError) {
    await supabase.storage.from(projectDocumentBucket).remove([filePath]);

    return {
      message: `The PDF was uploaded but metadata could not be saved: ${insertError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "project_document_uploaded",
    entity_type: "project_document",
    entity_id: documentId,
    metadata: {
      project_id: parsed.data.projectId,
      contractor_id: parsed.data.contractorId,
      document_type: parsed.data.documentType,
      title: parsed.data.title,
    },
  });

  if (auditError) {
    return {
      message: `Document uploaded, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidateProjectDocumentPaths(parsed.data.projectId);

  return {
    message: "Project document uploaded.",
    status: "success",
    fieldErrors: {},
  };
}

export async function updateProjectDocumentMetadataAction(
  _previousState: ProjectDocumentActionState,
  formData: FormData,
): Promise<ProjectDocumentActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = updateProjectDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    projectId: formData.get("projectId"),
    contractorId: formData.get("contractorId"),
    consultantName: formData.get("consultantName"),
    documentType: formData.get("documentType"),
    title: formData.get("title"),
    documentDate: formData.get("documentDate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      message: "Check the project document metadata and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: currentDocument, error: loadError } = await supabase
    .from("project_documents")
    .select(
      "id,project_id,contractor_id,consultant_name,document_type,title,document_date,file_path,file_name,status,notes",
    )
    .eq("id", parsed.data.documentId)
    .maybeSingle<ProjectDocumentLookup>();

  if (loadError || !currentDocument) {
    return {
      message: "This project document could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  if (currentDocument.project_id !== parsed.data.projectId) {
    return {
      message: "Project documents cannot be reassigned in phase 1.",
      status: "error",
      fieldErrors: {
        projectId: ["Keep the original project or delete and re-upload."],
      },
    };
  }

  const contractorExists = await ensureContractorExists(
    supabase,
    parsed.data.contractorId,
  );

  if (!contractorExists) {
    return {
      message: "Select an existing contractor.",
      status: "error",
      fieldErrors: {
        contractorId: ["Select an existing contractor."],
      },
    };
  }

  const nextDocument = {
    contractor_id: parsed.data.contractorId,
    consultant_name: parsed.data.consultantName,
    document_type: parsed.data.documentType,
    title: parsed.data.title,
    document_date: parsed.data.documentDate,
    notes: parsed.data.notes,
  };

  const { error: updateError } = await supabase
    .from("project_documents")
    .update(nextDocument)
    .eq("id", currentDocument.id);

  if (updateError) {
    return {
      message: `Could not update the project document: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "project_document_updated",
    entity_type: "project_document",
    entity_id: currentDocument.id,
    metadata: {
      project_id: currentDocument.project_id,
      before: {
        contractor_id: currentDocument.contractor_id,
        consultant_name: currentDocument.consultant_name,
        document_type: currentDocument.document_type,
        title: currentDocument.title,
        document_date: currentDocument.document_date,
        notes: currentDocument.notes,
      },
      after: nextDocument,
    },
  });

  if (auditError) {
    return {
      message: `Document updated, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidateProjectDocumentPaths(currentDocument.project_id);

  return {
    message: "Project document metadata updated.",
    status: "success",
    fieldErrors: {},
  };
}

export async function archiveProjectDocumentAction(
  _previousState: ProjectDocumentActionState,
  formData: FormData,
): Promise<ProjectDocumentActionState> {
  return setProjectDocumentStatus({
    formData,
    nextStatus: "archived",
    action: "project_document_archived",
    successMessage: "Project document archived.",
  });
}

export async function unarchiveProjectDocumentAction(
  _previousState: ProjectDocumentActionState,
  formData: FormData,
): Promise<ProjectDocumentActionState> {
  return setProjectDocumentStatus({
    formData,
    nextStatus: "active",
    action: "project_document_unarchived",
    successMessage: "Project document unarchived.",
  });
}

async function setProjectDocumentStatus({
  formData,
  nextStatus,
  action,
  successMessage,
}: {
  formData: FormData;
  nextStatus: "active" | "archived";
  action: string;
  successMessage: string;
}): Promise<ProjectDocumentActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = projectDocumentIdSchema.safeParse({
    documentId: formData.get("documentId"),
  });

  if (!parsed.success) {
    return {
      message: "Document is missing.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: document, error: loadError } = await supabase
    .from("project_documents")
    .select("id,project_id,status")
    .eq("id", parsed.data.documentId)
    .maybeSingle<{ id: string; project_id: string; status: string }>();

  if (loadError || !document) {
    return {
      message: "This project document could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: updateError } = await supabase
    .from("project_documents")
    .update({ status: nextStatus })
    .eq("id", document.id);

  if (updateError) {
    return {
      message: `Could not update the project document status: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action,
    entity_type: "project_document",
    entity_id: document.id,
    metadata: {
      project_id: document.project_id,
      from_status: document.status,
      to_status: nextStatus,
    },
  });

  if (auditError) {
    return {
      message: `Status updated, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidateProjectDocumentPaths(document.project_id);

  return {
    message: successMessage,
    status: "success",
    fieldErrors: {},
  };
}

export async function deleteProjectDocumentAction(
  _previousState: ProjectDocumentActionState,
  formData: FormData,
): Promise<ProjectDocumentActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = projectDocumentIdSchema.safeParse({
    documentId: formData.get("documentId"),
  });

  if (!parsed.success) {
    return {
      message: "Document is missing.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: document, error: loadError } = await supabase
    .from("project_documents")
    .select("id,project_id,file_path,file_name,title")
    .eq("id", parsed.data.documentId)
    .maybeSingle<{
      id: string;
      project_id: string;
      file_path: string;
      file_name: string;
      title: string;
    }>();

  if (loadError || !document) {
    return {
      message: "This project document could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: storageError } = await supabase.storage
    .from(projectDocumentBucket)
    .remove([document.file_path]);

  if (storageError) {
    return {
      message: `Could not remove the project document file: ${storageError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: deleteError } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", document.id);

  if (deleteError) {
    return {
      message: `Could not delete the project document: ${deleteError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "project_document_deleted",
    entity_type: "project_document",
    entity_id: document.id,
    metadata: {
      project_id: document.project_id,
      title: document.title,
      file_name: document.file_name,
    },
  });

  if (auditError) {
    return {
      message: `Document deleted, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidateProjectDocumentPaths(document.project_id);

  return {
    message: "Project document deleted.",
    status: "success",
    fieldErrors: {},
  };
}
