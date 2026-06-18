import { createClient } from "@/lib/supabase/server";

import type { PaymentStatementRecord } from "./types";

const paymentStatementColumns = `
  id,
  timesheet_id,
  contractor_id,
  project_id,
  total_hours,
  hourly_rate,
  net_amount,
  vat_treatment,
  vat_amount,
  gross_amount,
  currency,
  created_at,
  created_by
`;

export async function getPaymentStatementForTimesheet(timesheetId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_statements")
    .select(paymentStatementColumns)
    .eq("timesheet_id", timesheetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PaymentStatementRecord>();

  if (error) {
    throw new Error(`Could not load payment statement: ${error.message}`);
  }

  return data;
}
