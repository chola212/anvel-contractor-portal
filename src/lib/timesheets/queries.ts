import { createClient } from "@/lib/supabase/server";

import { toHours } from "./format";
import type {
  TimesheetContractorSummary,
  TimesheetDetail,
  TimesheetEntryRecord,
  TimesheetProjectSummary,
  TimesheetRecord,
  TimesheetSummary,
} from "./types";

const timesheetColumns = `
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
  comments,
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
      .select(timesheetColumns),
    filters,
  )
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<TimesheetRecord[]>();

  if (error) {
    throw new Error(`Could not load timesheets: ${error.message}`);
  }

  return hydrateTimesheets(data);
}

export async function getTimesheetsForContractor(
  contractorId: string,
  filters: TimesheetFilters = {},
) {
  const supabase = await createClient();
  const { data, error } = await applyTimesheetFilters(
    supabase
    .from("timesheets")
    .select(timesheetColumns)
      .eq("contractor_id", contractorId),
    filters,
  )
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<TimesheetRecord[]>();

  if (error) {
    throw new Error(`Could not load contractor timesheets: ${error.message}`);
  }

  return hydrateTimesheets(data);
}

export async function getTimesheetById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select(timesheetColumns)
    .eq("id", id)
    .maybeSingle<TimesheetRecord>();

  if (error) {
    throw new Error(`Could not load timesheet: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [summary] = await hydrateTimesheets([data]);
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
