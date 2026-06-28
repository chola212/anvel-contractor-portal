import type { ContractorStatus } from "@/lib/contractors/types";
import type { ProjectStatus } from "@/lib/projects/types";

export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reopened"
  | "locked";

export type TimesheetRecord = {
  id: string;
  contractor_id: string;
  project_id: string;
  year: number;
  month: number;
  status: TimesheetStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  reopened_by: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
};

export type TimesheetReopenEvent = {
  id: string;
  timesheet_id: string;
  reopened_by: string | null;
  reopened_at: string;
  reason: string;
  previous_status: "approved" | "rejected";
  created_at: string;
};

export type TimesheetEntryRecord = {
  id: string;
  timesheet_id: string;
  work_date: string;
  hours: number | string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type TimesheetContractorSummary = {
  id: string;
  legal_name: string;
  email: string;
  status: ContractorStatus;
};

export type TimesheetProjectSummary = {
  id: string;
  name: string;
  client_label: string | null;
  status: ProjectStatus;
};

export type TimesheetSummary = TimesheetRecord & {
  contractor: TimesheetContractorSummary | null;
  project: TimesheetProjectSummary | null;
  entry_count: number;
  total_hours: number;
};

export type TimesheetDetail = TimesheetSummary & {
  entries: TimesheetEntryRecord[];
};
