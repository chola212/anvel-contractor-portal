import type { VatTreatment } from "@/lib/contractors/types";

export type PaymentStatementRecord = {
  id: string;
  timesheet_id: string;
  contractor_id: string;
  project_id: string;
  total_hours: number | string;
  hourly_rate: number | string;
  net_amount: number | string;
  vat_treatment: VatTreatment;
  vat_amount: number | string;
  gross_amount: number | string;
  currency: string;
  created_at: string;
  created_by: string | null;
};
