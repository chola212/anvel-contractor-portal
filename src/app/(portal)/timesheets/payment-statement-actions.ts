"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import type { VatTreatment } from "@/lib/contractors/types";
import { selectSingleStatementRate } from "@/lib/payment-statements/rate-selection";
import { createClient } from "@/lib/supabase/server";
import type { TimesheetEntryRecord, TimesheetRecord } from "@/lib/timesheets/types";

const generatePaymentStatementSchema = z.object({
  timesheetId: z.string().uuid("Timesheet is missing."),
});

export type PaymentStatementActionState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

type ContractorForStatement = {
  id: string;
  vat_treatment: VatTreatment | null;
};

type AssignmentForStatement = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  hourly_rate: number | string;
  currency: string;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateVatAmount(netAmount: number, vatTreatment: VatTreatment) {
  if (vatTreatment === "cyprus_vat_19") {
    return roundMoney(netAmount * 0.19);
  }

  return 0;
}

function sumHours(entries: Pick<TimesheetEntryRecord, "hours">[]) {
  return entries.reduce((total, entry) => total + Number(entry.hours), 0);
}

export async function generatePaymentStatementAction(
  _previousState: PaymentStatementActionState,
  formData: FormData,
): Promise<PaymentStatementActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = generatePaymentStatementSchema.safeParse({
    timesheetId: formData.get("timesheetId"),
  });

  if (!parsed.success) {
    return {
      message: "Timesheet is missing.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: timesheet, error: timesheetError } = await supabase
    .from("timesheets")
    .select(
      "id,contractor_id,project_id,year,month,status,submitted_at,approved_by,approved_at,rejected_by,rejected_at,rejection_reason,comments,created_at,updated_at",
    )
    .eq("id", parsed.data.timesheetId)
    .maybeSingle<TimesheetRecord>();

  if (timesheetError || !timesheet) {
    return {
      message: "This timesheet could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  if (timesheet.status !== "approved") {
    return {
      message: "A payment statement can only be generated after approval.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { data: existingStatement, error: existingError } = await supabase
    .from("payment_statements")
    .select("id")
    .eq("timesheet_id", timesheet.id)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    return {
      message: `Could not check existing payment statements: ${existingError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  if (existingStatement) {
    return {
      message: "A payment statement already exists for this timesheet.",
      status: "error",
      fieldErrors: {},
    };
  }

  const [contractorResult, assignmentResult, entryResult] = await Promise.all([
    supabase
      .from("contractors")
      .select("id,vat_treatment")
      .eq("id", timesheet.contractor_id)
      .maybeSingle<ContractorForStatement>(),
    supabase
      .from("contractor_projects")
      .select("id,start_date,end_date,hourly_rate,currency")
      .eq("contractor_id", timesheet.contractor_id)
      .eq("project_id", timesheet.project_id)
      .returns<AssignmentForStatement[]>(),
    supabase
      .from("timesheet_entries")
      .select("work_date,hours")
      .eq("timesheet_id", timesheet.id)
      .returns<Pick<TimesheetEntryRecord, "work_date" | "hours">[]>(),
  ]);

  if (contractorResult.error || !contractorResult.data) {
    return {
      message: "The contractor profile could not be loaded.",
      status: "error",
      fieldErrors: {},
    };
  }

  if (!contractorResult.data.vat_treatment) {
    return {
      message: "Set the contractor VAT treatment before generating a statement.",
      status: "error",
      fieldErrors: {},
    };
  }

  if (assignmentResult.error || assignmentResult.data.length === 0) {
    return {
      message: "The contractor project rate could not be loaded.",
      status: "error",
      fieldErrors: {},
    };
  }

  if (entryResult.error) {
    return {
      message: `Could not load timesheet hours: ${entryResult.error.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const totalHours = roundMoney(sumHours(entryResult.data));

  if (totalHours <= 0) {
    return {
      message: "Approved timesheets need at least one hour before statement generation.",
      status: "error",
      fieldErrors: {},
    };
  }

  const rateSelection = selectSingleStatementRate(
    entryResult.data,
    assignmentResult.data,
  );

  if (!rateSelection.ok) {
    return {
      message: rateSelection.message,
      status: "error",
      fieldErrors: {},
    };
  }

  const hourlyRate = roundMoney(rateSelection.hourlyRate);
  const netAmount = roundMoney(totalHours * hourlyRate);
  const vatAmount = calculateVatAmount(
    netAmount,
    contractorResult.data.vat_treatment,
  );
  const grossAmount = roundMoney(netAmount + vatAmount);
  const { data: statement, error: insertError } = await supabase
    .from("payment_statements")
    .insert({
      timesheet_id: timesheet.id,
      contractor_id: timesheet.contractor_id,
      project_id: timesheet.project_id,
      total_hours: totalHours,
      hourly_rate: hourlyRate,
      net_amount: netAmount,
      vat_treatment: contractorResult.data.vat_treatment,
      vat_amount: vatAmount,
      gross_amount: grossAmount,
      currency: rateSelection.currency,
      created_by: profile.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !statement) {
    return {
      message:
        insertError?.code === "23505"
          ? "A payment statement already exists for this timesheet."
          : `Could not generate the payment statement: ${insertError?.message ?? "Unknown error"}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "payment_statement_generated",
    entity_type: "payment_statement",
    entity_id: statement.id,
    metadata: {
      timesheet_id: timesheet.id,
      total_hours: totalHours,
      net_amount: netAmount,
      gross_amount: grossAmount,
    },
  });

  if (auditError) {
    return {
      message: `Payment statement generated, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/timesheets/${timesheet.id}`);
  revalidatePath("/timesheets");
  revalidatePath("/payments");

  return {
    message: "Payment statement generated.",
    status: "success",
    fieldErrors: {},
  };
}
