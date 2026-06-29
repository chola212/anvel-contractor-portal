"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import {
  buildOnboardingDetailsRequestEmail,
  buildOnboardingDocumentsEmail,
  sendPortalEmail,
} from "@/lib/email/portal-email";
import {
  defaultOnboardingCurrency,
  defaultOnboardingSpecialConditions,
  defaultOnboardingSwiftBic,
  defaultTimesheetSubmissionInstructions,
  onboardingDocumentBucket,
} from "@/lib/onboarding/defaults";
import { generateOnboardingDocuments } from "@/lib/onboarding/pdf";
import type { OnboardingDocumentFormData } from "@/lib/onboarding/types";
import { createClient } from "@/lib/supabase/server";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const requiredText = (message: string, max = 1000) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, "Keep this value shorter.");

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null,
  z.string().max(1000).nullable(),
);

const detailsRequestSchema = z.object({
  recipientEmail: z.string().trim().email("Enter a valid recipient email."),
  contractorName: requiredText("Enter the contractor name.", 160),
  internalContractorReference: optionalText,
});

const onboardingDocumentsSchema = z.object({
  contractorId: optionalText.pipe(
    z.string().uuid("Select a valid contractor.").nullable(),
  ),
  recipientEmail: z.string().trim().email("Enter a valid recipient email."),
  recipientDisplayName: requiredText("Enter the recipient display name.", 160),
  internalContractorReference: optionalText,
  consultantLegalName: requiredText("Enter the consultant legal name.", 160),
  consultantAddress: requiredText("Enter the consultant address.", 1000),
  consultantTaxVatNumber: requiredText("Enter the tax/VAT number or N/A.", 120),
  consultantTitleStatus: requiredText("Enter the consultant title/status.", 120),
  effectiveDate: z.string().regex(datePattern, "Enter a valid effective date."),
  documentDate: z.string().regex(datePattern, "Enter a valid document date."),
  clientProjectReference: requiredText("Enter the client/project reference.", 200),
  projectClientLabel: requiredText(
    "Enter the project/client label used in clauses.",
    200,
  ),
  roleAssignmentTitle: requiredText("Enter the role or assignment title.", 200),
  startDate: z.string().regex(datePattern, "Enter a valid start date."),
  expectedEndDate: z.string().regex(datePattern, "Enter a valid expected end date."),
  initialDuration: requiredText("Enter the initial duration.", 120),
  workLocation: requiredText("Enter the work location.", 160),
  expectedWorkload: requiredText("Enter the expected workload.", 200),
  workingTimeZone: requiredText("Enter the working time zone.", 120),
  specificResponsibilities: requiredText("Enter the specific responsibilities.", 1500),
  agreedRateAmount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid rate, for example 85 or 85.50."),
  currency: z.literal("EUR", {
    message: "The MVP currency must remain EUR.",
  }),
  rateUnit: z.enum(["hour", "day"], {
    message: "Select hour or day.",
  }),
  paymentTerm: requiredText("Enter the payment term.", 120),
  timesheetSubmissionInstructions: requiredText(
    "Enter the timesheet submission instructions.",
    1200,
  ),
  specialConditions: requiredText("Enter special conditions or N/A.", 1000),
  bankAccountHolder: requiredText("Enter the bank account holder.", 160),
  ibanOrAccountNumber: requiredText("Enter the IBAN or account number.", 120),
  swiftBic: requiredText("Enter the SWIFT/BIC or N/A.", 60),
  bankName: requiredText("Enter the bank name.", 160),
  bankCountryAddress: requiredText("Enter the bank country/address.", 400),
  additionalBankDetails: optionalText,
});

export type OnboardingActionState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

const initialDefaults = {
  currency: defaultOnboardingCurrency,
  timesheetSubmissionInstructions: defaultTimesheetSubmissionInstructions,
  specialConditions: defaultOnboardingSpecialConditions,
  swiftBic: defaultOnboardingSwiftBic,
};

function safeArchiveFileName(value: string) {
  return value
    .replace(/\.pdf$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110)
    .concat(".pdf");
}

function generationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Unknown PDF generation error.";
}

export async function sendOnboardingDetailsRequestAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = detailsRequestSchema.safeParse({
    recipientEmail: formData.get("recipientEmail"),
    contractorName: formData.get("contractorName"),
    internalContractorReference: formData.get("internalContractorReference"),
  });

  if (!parsed.success) {
    return {
      message: "Check the onboarding details request and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      message: "Onboarding email could not be sent. Check email configuration.",
      status: "error",
      fieldErrors: {},
    };
  }

  const supabase = await createClient();

  try {
    const email = buildOnboardingDetailsRequestEmail(parsed.data.contractorName);
    await sendPortalEmail({
      to: parsed.data.recipientEmail,
      ...email,
    });
  } catch (error) {
    console.error("Onboarding details request email failed", error);
    return {
      message: "Onboarding email could not be sent. Check email configuration.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "onboarding_details_request_sent",
    entity_type: "onboarding",
    entity_id: null,
    metadata: {
      email: parsed.data.recipientEmail,
      contractor_name: parsed.data.contractorName,
      internal_contractor_reference: parsed.data.internalContractorReference,
    },
  });

  if (auditError) {
    return {
      message: `Email sent, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/onboarding");

  return {
    message: "Contract details request sent.",
    status: "success",
    fieldErrors: {},
  };
}

export async function sendOnboardingDocumentsEmailAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = onboardingDocumentsSchema.safeParse({
    ...initialDefaults,
    contractorId: formData.get("contractorId"),
    recipientEmail: formData.get("recipientEmail"),
    recipientDisplayName: formData.get("recipientDisplayName"),
    internalContractorReference: formData.get("internalContractorReference"),
    consultantLegalName: formData.get("consultantLegalName"),
    consultantAddress: formData.get("consultantAddress"),
    consultantTaxVatNumber: formData.get("consultantTaxVatNumber"),
    consultantTitleStatus: formData.get("consultantTitleStatus"),
    effectiveDate: formData.get("effectiveDate"),
    documentDate: formData.get("documentDate"),
    clientProjectReference: formData.get("clientProjectReference"),
    projectClientLabel: formData.get("projectClientLabel"),
    roleAssignmentTitle: formData.get("roleAssignmentTitle"),
    startDate: formData.get("startDate"),
    expectedEndDate: formData.get("expectedEndDate"),
    initialDuration: formData.get("initialDuration"),
    workLocation: formData.get("workLocation"),
    expectedWorkload: formData.get("expectedWorkload"),
    workingTimeZone: formData.get("workingTimeZone"),
    specificResponsibilities: formData.get("specificResponsibilities"),
    agreedRateAmount: formData.get("agreedRateAmount"),
    currency: formData.get("currency"),
    rateUnit: formData.get("rateUnit"),
    paymentTerm: formData.get("paymentTerm"),
    timesheetSubmissionInstructions: formData.get("timesheetSubmissionInstructions"),
    specialConditions: formData.get("specialConditions"),
    bankAccountHolder: formData.get("bankAccountHolder"),
    ibanOrAccountNumber: formData.get("ibanOrAccountNumber"),
    swiftBic: formData.get("swiftBic"),
    bankName: formData.get("bankName"),
    bankCountryAddress: formData.get("bankCountryAddress"),
    additionalBankDetails: formData.get("additionalBankDetails"),
  });

  if (!parsed.success) {
    return {
      message: "Check the onboarding document details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      message: "Onboarding documents email could not be sent. Check email configuration.",
      status: "error",
      fieldErrors: {},
    };
  }

  const supabase = await createClient();

  let generatedDocuments;

  try {
    generatedDocuments = generateOnboardingDocuments(
      parsed.data as OnboardingDocumentFormData,
    );
  } catch (error) {
    console.error("Onboarding PDF generation failed", error);
    const message = generationErrorMessage(error);
    return {
      message: `Could not generate the onboarding PDFs: ${message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const archivedDocuments: {
    id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    size: number;
  }[] = [];

  for (const document of generatedDocuments) {
    const documentId = crypto.randomUUID();
    const fileName = safeArchiveFileName(document.fileName);
    const archiveOwner = parsed.data.contractorId ?? "unlinked";
    const filePath = `onboarding/${archiveOwner}/${documentId}-${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(onboardingDocumentBucket)
      .upload(filePath, Buffer.from(document.pdf), {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      await supabase.storage
        .from(onboardingDocumentBucket)
        .remove(archivedDocuments.map((item) => item.file_path));

      return {
        message: `Could not archive the generated PDFs: ${uploadError.message}`,
        status: "error",
        fieldErrors: {},
      };
    }

    archivedDocuments.push({
      id: documentId,
      document_type: document.documentType,
      file_name: fileName,
      file_path: filePath,
      size: document.pdf.byteLength,
    });
  }

  try {
    const email = buildOnboardingDocumentsEmail(parsed.data.recipientDisplayName);
    await sendPortalEmail({
      to: parsed.data.recipientEmail,
      ...email,
      attachments: generatedDocuments.map((document) => ({
        filename: safeArchiveFileName(document.fileName),
        content: Buffer.from(document.pdf).toString("base64"),
      })),
    });
  } catch (error) {
    console.error("Onboarding documents email failed", error);
    await supabase.storage
      .from(onboardingDocumentBucket)
      .remove(archivedDocuments.map((item) => item.file_path));

    return {
      message:
        "Onboarding documents email could not be sent. Check email configuration.",
      status: "error",
      fieldErrors: {},
    };
  }

  const sentAt = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("contractor_onboarding_documents")
    .insert(
      archivedDocuments.map((document) => ({
        id: document.id,
        contractor_id: parsed.data.contractorId,
        document_type: document.document_type,
        file_name: document.file_name,
        file_path: document.file_path,
        sent_to: parsed.data.recipientEmail,
        sent_at: sentAt,
        created_by: profile.id,
        metadata: {
          recipient_display_name: parsed.data.recipientDisplayName,
          consultant_legal_name: parsed.data.consultantLegalName,
          client_project_reference: parsed.data.clientProjectReference,
          project_client_label: parsed.data.projectClientLabel,
          role_assignment_title: parsed.data.roleAssignmentTitle,
          document_date: parsed.data.documentDate,
          internal_contractor_reference:
            parsed.data.internalContractorReference,
          file_size_bytes: document.size,
        },
      })),
    );

  if (insertError) {
    return {
      message: `Documents were emailed, but archive metadata could not be saved: ${insertError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "onboarding_documents_email_sent",
    entity_type: "onboarding",
    entity_id: parsed.data.contractorId,
    metadata: {
      email: parsed.data.recipientEmail,
      recipient_display_name: parsed.data.recipientDisplayName,
      consultant_legal_name: parsed.data.consultantLegalName,
      document_types: generatedDocuments.map((document) => document.documentType),
      client_project_reference: parsed.data.clientProjectReference,
      project_client_label: parsed.data.projectClientLabel,
      role_assignment_title: parsed.data.roleAssignmentTitle,
      internal_contractor_reference: parsed.data.internalContractorReference,
    },
  });

  if (auditError) {
    return {
      message: `Documents emailed, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/onboarding");

  return {
    message: "Onboarding documents generated and emailed.",
    status: "success",
    fieldErrors: {},
  };
}
