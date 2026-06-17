import type { ContractorStatus, SupplierType } from "@/lib/contractors/types";

export type DocumentStatus =
  | "missing"
  | "uploaded"
  | "approved"
  | "rejected"
  | "expired";

export type DocumentRequirementRecord = {
  id: string;
  supplier_type: SupplierType | null;
  name: string;
  is_required: boolean;
  requires_expiry_date: boolean;
  created_at: string;
};

export type ContractorDocumentRecord = {
  id: string;
  contractor_id: string;
  document_requirement_id: string | null;
  document_type: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: DocumentStatus;
  expiry_date: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentContractorSummary = {
  id: string;
  legal_name: string;
  email: string;
  status: ContractorStatus;
};

export type ContractorDocument = ContractorDocumentRecord & {
  contractor: DocumentContractorSummary | null;
  requirement: DocumentRequirementRecord | null;
};
