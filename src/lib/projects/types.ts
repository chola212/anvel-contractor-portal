import type { ContractorStatus } from "@/lib/contractors/types";

export type ProjectStatus = "planned" | "active" | "paused" | "closed";

export type ProjectRecord = {
  id: string;
  name: string;
  client_label: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  currency: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractorProjectRecord = {
  id: string;
  contractor_id: string;
  project_id: string;
  hourly_rate: number | string;
  currency: string;
  sales_rate: number | string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type AssignmentContractorSummary = {
  id: string;
  legal_name: string;
  email: string;
  status: ContractorStatus;
};

export type AssignmentProjectSummary = {
  id: string;
  name: string;
  client_label: string | null;
  status: ProjectStatus;
};

export type ProjectAssignment = ContractorProjectRecord & {
  contractor: AssignmentContractorSummary | null;
  project: AssignmentProjectSummary | null;
};
