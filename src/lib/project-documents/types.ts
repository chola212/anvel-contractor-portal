import type { ContractorStatus } from "@/lib/contractors/types";
import type { ProjectStatus } from "@/lib/projects/types";

export const projectDocumentTypes = [
  "Purchase Order",
  "Client Contract",
  "Statement of Work",
  "Work Order",
  "Rate Confirmation",
  "Client NDA",
  "Client Timesheet Approval",
  "Other",
] as const;

export type ProjectDocumentType = (typeof projectDocumentTypes)[number];

export type ProjectDocumentStatus = "active" | "archived";

export type ProjectDocumentRecord = {
  id: string;
  project_id: string;
  contractor_id: string | null;
  consultant_name: string | null;
  document_type: ProjectDocumentType;
  title: string;
  document_date: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: ProjectDocumentStatus;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectDocumentProjectSummary = {
  id: string;
  name: string;
  client_label: string | null;
  status: ProjectStatus;
};

export type ProjectDocumentContractorSummary = {
  id: string;
  legal_name: string;
  email: string;
  status: ContractorStatus;
};

export type ProjectDocument = ProjectDocumentRecord & {
  project: ProjectDocumentProjectSummary | null;
  contractor: ProjectDocumentContractorSummary | null;
};
