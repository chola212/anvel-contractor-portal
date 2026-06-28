import { createClient } from "@/lib/supabase/server";

import { toHours } from "./format";
import type {
  TimesheetContractorSummary,
  TimesheetDetail,
  TimesheetEntryRecord,
  TimesheetProjectSummary,
  TimesheetRecord,
  TimesheetReopenEvent,
  TimesheetSummary,
} from "./types";

const timesheetCoreColumns = `
  id,
  contractor_id,
  project_id,
  year,
  month,
  status,
  submitted_at,
  approved_by,
  approved_at,
  rejected_by,
  rejected_at,
  rejection_reason,
  reopened_by,
  reopened_at,
  reopen_reason,
  created_at,
  updated_at
`;

const entryColumns = `
  id,
  timesheet_id,
  work_date,
  hours,
  note,
  created_at,
  updated_at
`;

export type TimesheetFilters = {
  month?: string;
  status?: string;
};

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return { year, month };
}

type TimesheetFilterableQuery<T> = T & {
  eq(column: string, value: string | number): TimesheetFilterableQuery<T>;
};

function applyTimesheetFilters<T>(
  query: T,
  filters: TimesheetFilters = {},
) {
  let nextQuery = query as TimesheetFilterableQuery<T>;

  if (filters.month) {
    const { year, month } = parseMonth(filters.month);
    nextQuery = nextQuery.eq("year", year).eq("month", month);
  }

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }

  return nextQuery as T;
}

export async function getTimesheetsForStaff(filters: TimesheetFilters = {}) {
  const supabase = await createClient();
  const { data, error } = await applyTimesheetFilters(
    supabase
    .from("timesheets")
      .select(timesheetCoreColumns),
    filters,
  )
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Omit<TimesheetRecord, "comments">[]>();

  if (error) {
    throw new Error(`Could not load timesheets: ${error.message}`);
  }

  return hydrateTimesheets(await addTimesheetComments(data));
}

export async function getTimesheetsForContractor(
  contractorId: string,
  filters: TimesheetFilters = {},
) {
  const supabase = await createClient();
  const { data, error } = await applyTimesheetFilters(
    supabase
    .from("timesheets")
    .select(timesheetCoreColumns)
      .eq("contractor_id", contractorId),
    filters,
  )
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Omit<TimesheetRecord, "comments">[]>();

  if (error) {
    throw new Error(`Could not load contractor timesheets: ${error.message}`);
  }

  return hydrateTimesheets(await addTimesheetComments(data));
}

export async function getTimesheetById(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(timesheetCoreColumns)
    .eq("id", id)
    .maybeSingle<Omit<TimesheetRecord, "comments">>();

  if (error) {
    throw new Error(`Could not load timesheet: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [timesheetWithComments] = await addTimesheetComments([data]);
  const [summary] = await hydrateTimesheets([timesheetWithComments]);
  const { data: entries, error: entriesError } = await supabase
    .from("timesheet_entries")
    .select(entryColumns)
    .eq("timesheet_id", data.id)
    .order("work_date", { ascending: true })
    .returns<TimesheetEntryRecord[]>();

  if (entriesError) {
    throw new Error(`Could not load timesheet entries: ${entriesError.message}`);
  }

  return {
    ...summary,
    entries,
  } satisfies TimesheetDetail;
}

export async function getTimesheetReopenEvents(timesheetId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheet_reopen_events")
    .select(
      "id,timesheet_id,reopened_by,reopened_at,reason,previous_status,created_at",
    )
    .eq("timesheet_id", timesheetId)
    .order("reopened_at", { ascending: false })
    .returns<TimesheetReopenEvent[]>();

  if (error) {
    throw new Error(`Could not load timesheet reopen history: ${error.message}`);
  }

  return data;
}

export async function getTimesheetInvoiceLifecycle(timesheetId: string) {
  const supabase = await createClient();
  const [selfBillingResult, outgoingResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,status,cancelled_at,cancellation_reason,cancellation_email_status",
      )
      .eq("timesheet_id", timesheetId)
      .eq("invoice_type", "self_billing")
      .order("created_at", { ascending: false })
      .returns<
        {
          id: string;
          invoice_number: string;
          status: string;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          cancellation_email_status: string;
        }[]
      >(),
    supabase
      .from("outgoing_invoices")
      .select(
        "id,invoice_number,status,cancelled_at,cancellation_reason,cancellation_email_status",
      )
      .eq("timesheet_id", timesheetId)
      .order("created_at", { ascending: false })
      .returns<
        {
          id: string;
          invoice_number: string;
          status: string;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          cancellation_email_status: string;
        }[]
      >(),
  ]);

  if (selfBillingResult.error) {
    throw new Error(
      `Could not load related self-billing invoices: ${selfBillingResult.error.message}`,
    );
  }

  if (outgoingResult.error) {
    throw new Error(
      `Could not load related outgoing invoices: ${outgoingResult.error.message}`,
    );
  }

  return {
    selfBilling: selfBillingResult.data,
    outgoing: outgoingResult.data,
  };
}

async function addTimesheetComments(
  timesheets: Omit<TimesheetRecord, "comments">[],
) {
  if (timesheets.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select("id,comments")
    .in(
      "id",
      timesheets.map((timesheet) => timesheet.id),
    )
    .returns<{ id: string; comments: string | null }[]>();

  if (error?.code === "42703") {
    console.warn(
      "Timesheet comments migration is not applied; loading core timesheet data without comments.",
    );

    return timesheets.map((timesheet) => ({
      ...timesheet,
      comments: null,
    }));
  }

  if (error) {
    throw new Error(`Could not load timesheet comments: ${error.message}`);
  }

  const commentsByTimesheet = new Map(
    data.map((timesheet) => [timesheet.id, timesheet.comments]),
  );

  return timesheets.map((timesheet) => ({
    ...timesheet,
    comments: commentsByTimesheet.get(timesheet.id) ?? null,
  }));
}

async function hydrateTimesheets(timesheets: TimesheetRecord[]) {
  if (timesheets.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const contractorIds = [
    ...new Set(timesheets.map((timesheet) => timesheet.contractor_id)),
  ];
  const projectIds = [
    ...new Set(timesheets.map((timesheet) => timesheet.project_id)),
  ];
  const timesheetIds = timesheets.map((timesheet) => timesheet.id);

  const [contractorResult, projectResult, entryResult] = await Promise.all([
    supabase
      .from("contractors")
      .select("id,legal_name,email,status")
      .in("id", contractorIds)
      .returns<TimesheetContractorSummary[]>(),
    supabase
      .from("projects")
      .select("id,name,client_label,status")
      .in("id", projectIds)
      .returns<TimesheetProjectSummary[]>(),
    supabase
      .from("timesheet_entries")
      .select("timesheet_id,hours")
      .in("timesheet_id", timesheetIds)
      .returns<Pick<TimesheetEntryRecord, "timesheet_id" | "hours">[]>(),
  ]);

  if (contractorResult.error) {
    throw new Error(
      `Could not load timesheet contractors: ${contractorResult.error.message}`,
    );
  }

  if (projectResult.error) {
    throw new Error(
      `Could not load timesheet projects: ${projectResult.error.message}`,
    );
  }

  if (entryResult.error) {
    throw new Error(
      `Could not load timesheet totals: ${entryResult.error.message}`,
    );
  }

  const contractors = new Map<string, TimesheetContractorSummary>(
    contractorResult.data.map((contractor) => [contractor.id, contractor]),
  );
  const projects = new Map<string, TimesheetProjectSummary>(
    projectResult.data.map((project) => [project.id, project]),
  );
  const totals = new Map<string, { entry_count: number; total_hours: number }>();

  for (const entry of entryResult.data) {
    const current = totals.get(entry.timesheet_id) ?? {
      entry_count: 0,
      total_hours: 0,
    };

    totals.set(entry.timesheet_id, {
      entry_count: current.entry_count + 1,
      total_hours: current.total_hours + toHours(entry.hours),
    });
  }

  return timesheets.map<TimesheetSummary>((timesheet) => {
    const total = totals.get(timesheet.id) ?? {
      entry_count: 0,
      total_hours: 0,
    };

    return {
      ...timesheet,
      contractor: contractors.get(timesheet.contractor_id) ?? null,
      project: projects.get(timesheet.project_id) ?? null,
      entry_count: total.entry_count,
      total_hours: total.total_hours,
    };
  });
}
