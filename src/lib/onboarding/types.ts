export type OnboardingDocumentType =
  | "framework_agreement"
  | "assignment_schedule"
  | "nda_data_protection";

export type OnboardingDocumentFormData = {
  contractorId: string | null;
  recipientEmail: string;
  recipientDisplayName: string;
  consultantLegalName: string;
  consultantAddress: string;
  consultantTaxVatNumber: string;
  consultantTitleStatus: string;
  effectiveDate: string;
  documentDate: string;
  clientProjectReference: string;
  roleAssignmentTitle: string;
  startDate: string;
  expectedEndDate: string;
  initialDuration: string;
  workLocation: string;
  expectedWorkload: string;
  workingTimeZone: string;
  specificResponsibilities: string;
  agreedRateAmount: string;
  currency: string;
  rateUnit: "hour" | "day";
  paymentTerm: string;
  timesheetSubmissionInstructions: string;
  specialConditions: string;
  bankAccountHolder: string;
  ibanOrAccountNumber: string;
  swiftBic: string;
  bankName: string;
  bankCountryAddress: string;
  additionalBankDetails: string | null;
};

export type GeneratedOnboardingDocument = {
  documentType: OnboardingDocumentType;
  title: string;
  fileName: string;
  pdf: Uint8Array;
};

export type ContractorOnboardingDocumentRecord = {
  id: string;
  contractor_id: string | null;
  document_type: OnboardingDocumentType;
  file_name: string;
  file_path: string;
  sent_to: string;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type ContractorOnboardingDocumentContractorSummary = {
  id: string;
  legal_name: string;
  email: string;
  status: string;
};

export type ContractorOnboardingDocument =
  ContractorOnboardingDocumentRecord & {
    contractor: ContractorOnboardingDocumentContractorSummary | null;
  };
