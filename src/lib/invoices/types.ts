import type { ContractorStatus } from "@/lib/contractors/types";
import type { ProjectStatus } from "@/lib/projects/types";

export type InvoiceStatus =
  | "pending_upload"
  | "uploaded"
  | "checked"
  | "correction_required"
  | "approved_for_payment"
  | "paid"
  | "on_hold";

export type InvoiceType = "self_billing" | "contractor_uploaded";
export type InvoiceEmailStatus = "not_sent" | "sent" | "failed";

export type InvoiceRecord = {
  id: string;
  payment_statement_id: string | null;
  timesheet_id: string | null;
  contractor_id: string;
  invoice_type: InvoiceType;
  invoice_number: string;
  invoice_date: string;
  net_amount: number | string;
  vat_amount: number | string;
  gross_amount: number | string;
  currency: string;
  file_path: string;
  file_name: string;
  status: InvoiceStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  generated_by: string | null;
  generated_at: string | null;
  emailed_at: string | null;
  email_status: InvoiceEmailStatus;
  created_at: string;
  updated_at: string;
};

export type InvoiceContractorSummary = {
  id: string;
  legal_name: string;
  email: string;
  status: ContractorStatus;
};

export type InvoiceProjectSummary = {
  id: string;
  name: string;
  client_label: string | null;
  status: ProjectStatus;
};

export type InvoicePaymentStatementSummary = {
  id: string;
  timesheet_id: string;
  project_id: string;
  total_hours: number | string;
  gross_amount: number | string;
  currency: string;
  created_at: string;
};

export type ContractorInvoice = InvoiceRecord & {
  contractor: InvoiceContractorSummary | null;
  project: InvoiceProjectSummary | null;
  statement: InvoicePaymentStatementSummary | null;
};

export type InvoiceUploadStatement = InvoicePaymentStatementSummary & {
  net_amount: number | string;
  vat_amount: number | string;
  contractor_id: string;
  project: InvoiceProjectSummary | null;
};
