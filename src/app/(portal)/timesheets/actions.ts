"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { createClient } from "@/lib/supabase/server";
import type { TimesheetRecord } from "@/lib/timesheets/types";

const editableStatuses = ["draft", "rejected", "reopened"] as const;

const startTimesheetSchema = z.object({
  projectId: z.string().uuid("Select an assigned project."),
  year: z.coerce
    .number()
    .int("Enter a valid year.")
    .min(2024, "Year must be 2024 or later.")
    .max(2100, "Year is too far in the future."),
  month: z.coerce
    .number()
    .int("Select a valid month.")
    .min(1, "Select a valid month.")
    .max(12, "Select a valid month."),
});

const addEntrySchema = z.object({
  timesheetId: z.string().uuid("Timesheet is missing."),
  workDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid work date."),
  hours: z.coerce
    .number()
    .gt(0, "Enter hours greater than 0.")
    .max(24, "Hours cannot be above 24 for one day."),
  note: z
    .string()
    .trim()
    .max(280, "Keep notes brief.")
    .optional()
    .transform((value) => (value ? value : null)),
});

const timesheetIdSchema = z.object({
  timesheetId: z.string().uuid("Timesheet is missing."),
});

const entryIdSchema = z.object({
  timesheetId: z.string().uuid("Timesheet is missing."),
  entryId: z.string().uuid("Entry is missing."),
});

export type TimesheetActionState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

type AssignmentForCheck = {
  id: string;
};

function initialErrorState(message: string): TimesheetActionState {
  return {
    message,
    status: "error",
    fieldErrors: {},
  };
}

function parseWorkDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

async function requireContractor() {
  const profile = await requireRole(["contractor"]);
  const contractor = await getContractorByProfileId(profile.id);

  if (!contractor) {
    return {
      profile,
      contractor: null,
      state: initialErrorState(
        "Your account is not linked to a contractor profile.",
      ),
    };
  }

  return {
    profile,
    contractor,
    state: null,
  };
}

async function getEditableOwnTimesheet(timesheetId: string) {
  const { contractor, state } = await requireContractor();

  if (!contractor) {
    return {
      contractor: null,
      timesheet: null,
      state,
    };
  }

  const supabase = await createClient();
  const { data: timesheet, error } = await supabase
    .from("timesheets")
    .select(
      "id,contractor_id,project_id,year,month,status,submitted_at,approved_by,approved_at,rejected_by,rejected_at,rejection_reason,created_at,updated_at",
    )
    .eq("id", timesheetId)
    .maybeSingle<TimesheetRecord>();

  if (error || !timesheet || timesheet.contractor_id !== contractor.id) {
    return {
      contractor,
      timesheet: null,
      state: initialErrorState("This timesheet could not be found."),
    };
  }

  if (!editableStatuses.includes(timesheet.status as (typeof editableStatuses)[number])) {
    return {
      contractor,
      timesheet,
      state: initialErrorState(
        "This timesheet is no longer editable by the contractor.",
      ),
    };
  }

  return {
    contractor,
    timesheet,
    state: null,
  };
}

export async function startTimesheetAction(
  _previousState: TimesheetActionState,
  formData: FormData,
): Promise<TimesheetActionState> {
  const { contractor, state } = await requireContractor();

  if (!contractor) {
    return state;
  }

  const parsed = startTimesheetSchema.safeParse({
    projectId: formData.get("projectId"),
    year: formData.get("year"),
    month: formData.get("month"),
  });

  if (!parsed.success) {
    return {
      message: "Check the timesheet details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("contractor_projects")
    .select("id")
    .eq("contractor_id", contractor.id)
    .eq("project_id", parsed.data.projectId)
    .in("status", ["planned", "active"])
    .maybeSingle<AssignmentForCheck>();

  if (assignmentError || !assignment) {
    return {
      message: "Select a project assigned to your contractor profile.",
      status: "error",
      fieldErrors: {
        projectId: ["Select an assigned project."],
      },
    };
  }

  const { data: timesheet, error } = await supabase
    .from("timesheets")
    .insert({
      contractor_id: contractor.id,
      project_id: parsed.data.projectId,
      year: parsed.data.year,
      month: parsed.data.month,
      status: "draft",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !timesheet) {
    return {
      message:
        error?.code === "23505"
          ? "A timesheet already exists for this project and month."
          : `Could not start the timesheet: ${error?.message ?? "Unknown error"}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/timesheets");
  redirect(`/timesheets/${timesheet.id}`);
}

export async function addTimesheetEntryAction(
  _previousState: TimesheetActionState,
  formData: FormData,
): Promise<TimesheetActionState> {
  const parsed = addEntrySchema.safeParse({
    timesheetId: formData.get("timesheetId"),
    workDate: formData.get("workDate"),
    hours: formData.get("hours"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      message: "Check the daily entry and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { timesheet, state } = await getEditableOwnTimesheet(
    parsed.data.timesheetId,
  );

  if (!timesheet) {
    return state;
  }

  const workDate = parseWorkDate(parsed.data.workDate);

  if (!workDate) {
    return {
      message: "Check the daily entry and try again.",
      status: "error",
      fieldErrors: {
        workDate: ["Enter a valid work date."],
      },
    };
  }

  if (
    workDate.getUTCFullYear() !== timesheet.year ||
    workDate.getUTCMonth() + 1 !== timesheet.month
  ) {
    return {
      message: "The work date must be inside this timesheet month.",
      status: "error",
      fieldErrors: {
        workDate: ["Choose a date inside this timesheet month."],
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("timesheet_entries").insert({
    timesheet_id: timesheet.id,
    work_date: parsed.data.workDate,
    hours: parsed.data.hours,
    note: parsed.data.note,
  });

  if (error) {
    return {
      message:
        error.code === "23505"
          ? "This timesheet already has an entry for that date."
          : `Could not add the daily entry: ${error.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/timesheets/${timesheet.id}`);
  revalidatePath("/timesheets");

  const warnings = [
    parsed.data.hours > 10 ? "hours are above 10 for one day" : null,
    isWeekend(workDate) ? "the work date is a weekend" : null,
  ].filter(Boolean);

  return {
    message:
      warnings.length > 0
        ? `Entry added. Warning: ${warnings.join(" and ")}.`
        : "Entry added.",
    status: "success",
    fieldErrors: {},
  };
}

export async function deleteTimesheetEntryAction(formData: FormData) {
  const parsed = entryIdSchema.safeParse({
    timesheetId: formData.get("timesheetId"),
    entryId: formData.get("entryId"),
  });

  if (!parsed.success) {
    return;
  }

  const { timesheet } = await getEditableOwnTimesheet(parsed.data.timesheetId);

  if (!timesheet) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("timesheet_entries")
    .delete()
    .eq("id", parsed.data.entryId)
    .eq("timesheet_id", timesheet.id);

  revalidatePath(`/timesheets/${timesheet.id}`);
  revalidatePath("/timesheets");
}

export async function submitTimesheetAction(
  _previousState: TimesheetActionState,
  formData: FormData,
): Promise<TimesheetActionState> {
  const parsed = timesheetIdSchema.safeParse({
    timesheetId: formData.get("timesheetId"),
  });

  if (!parsed.success) {
    return {
      message: "Timesheet is missing.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { timesheet, state } = await getEditableOwnTimesheet(
    parsed.data.timesheetId,
  );

  if (!timesheet) {
    return state;
  }

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("timesheet_entries")
    .select("id", { count: "exact", head: true })
    .eq("timesheet_id", timesheet.id);

  if (countError || !count) {
    return {
      message: "Add at least one daily entry before submitting.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { error } = await supabase
    .from("timesheets")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq("id", timesheet.id);

  if (error) {
    return {
      message: `Could not submit the timesheet: ${error.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/timesheets/${timesheet.id}`);
  revalidatePath("/timesheets");

  return {
    message: "Timesheet submitted for review.",
    status: "success",
    fieldErrors: {},
  };
}
