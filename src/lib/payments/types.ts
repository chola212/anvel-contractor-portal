import type { ContractorStatus } from "@/lib/contractors/types";
import type { InvoiceStatus } from "@/lib/invoices/types";
import type { ProjectStatus } from "@/lib/projects/types";

export type PaymentStatus = "pending" | "approved" | "paid" | "on_hold";

export type PaymentRecord = {
  id: string;
  invoice_id: string;
  status: PaymentStatus;
  payment_date: string | null;
  payment_reference: string | null;
  paid_amount: number | string | null;
  currency: string;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentInvoiceRecord = {
  id: string;
  payment_statement_id: string | null;
  contractor_id: string;
  invoice_number: string;
  invoice_date: string;
  net_amount: number | string;
  vat_amount: number | string;
  gross_amount: number | string;
  currency: string;
  status: InvoiceStatus;
  created_at: string;
};

export type PaymentContractorSummary = {
  id: string;
  legal_name: string;
  email: string;
  status: ContractorStatus;
};

export type PaymentStatementSummary = {
  id: string;
  project_id: string;
};

export type PaymentProjectSummary = {
  id: string;
  name: string;
  client_label: string | null;
  status: ProjectStatus;
};

export type PaymentRow = {
  invoice: PaymentInvoiceRecord;
  contractor: PaymentContractorSummary | null;
  project: PaymentProjectSummary | null;
  payment: PaymentRecord | null;
};
