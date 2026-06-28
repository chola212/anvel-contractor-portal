export type OutgoingVatTreatment =
  | "cyprus_vat_19"
  | "eu_reverse_charge_0"
  | "non_eu_outside_scope"
  | "manual_review";

export type OutgoingInvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export type CompanyInvoiceSettings = {
  id: string;
  company_legal_name: string;
  trading_name: string | null;
  company_address: string;
  company_city_region: string | null;
  company_country: string;
  company_vat_number: string;
  invoice_sender_name: string | null;
  default_invoice_notes: string | null;
  bank_name: string;
  bank_account_name: string;
  iban: string;
  swift_bic: string;
  default_payment_terms_days: 30;
  default_currency: "EUR";
  created_at: string;
  updated_at: string;
};

export type ProjectBillingDetails = {
  id: string;
  project_id: string;
  billing_legal_name: string;
  billing_email: string;
  billing_cc_emails: string[];
  billing_address: string;
  billing_country: string;
  billing_vat_number: string;
  po_reference: string | null;
  vat_treatment: OutgoingVatTreatment;
  default_invoice_description: string | null;
  invoice_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OutgoingInvoice = {
  id: string;
  timesheet_id: string;
  project_id: string;
  contractor_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  year: number;
  month: number;
  status: OutgoingInvoiceStatus;
  currency: "EUR";
  company_legal_name: string;
  company_trading_name: string | null;
  company_address: string;
  company_city_region: string | null;
  company_country: string;
  company_vat_number: string;
  company_bank_name: string;
  company_bank_account_name: string;
  company_iban: string;
  company_swift_bic: string;
  company_invoice_notes: string | null;
  billing_legal_name: string;
  billing_email: string;
  billing_cc_emails: string[];
  billing_address: string;
  billing_country: string;
  billing_vat_number: string;
  po_reference: string | null;
  billing_invoice_notes: string | null;
  project_name: string;
  consultant_name: string;
  consultant_email: string | null;
  quantity: number | string;
  unit_label: string;
  sales_rate: number | string;
  net_amount: number | string;
  vat_treatment: OutgoingVatTreatment;
  vat_rate: number | string;
  vat_amount: number | string;
  gross_amount: number | string;
  pdf_file_path: string | null;
  pdf_file_name: string | null;
  email_status: "not_sent" | "sent" | "failed";
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  cancellation_email_status:
    | "not_required"
    | "sent"
    | "failed";
  cancellation_emailed_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  paid_amount: number | string | null;
  payment_reference: string | null;
  internal_note: string | null;
  created_by: string | null;
  sent_by: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OutgoingInvoiceLine = {
  id: string;
  outgoing_invoice_id: string;
  description: string;
  quantity: number | string;
  unit_label: string;
  unit_rate: number | string;
  net_amount: number | string;
  sort_order: number;
  created_at: string;
};

export type OutgoingInvoiceDetail = OutgoingInvoice & {
  lines: OutgoingInvoiceLine[];
};
