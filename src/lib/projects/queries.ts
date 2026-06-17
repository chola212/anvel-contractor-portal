import { createClient } from "@/lib/supabase/server";
import type { ContractorRecord } from "@/lib/contractors/types";

import type {
  AssignmentContractorSummary,
  AssignmentProjectSummary,
  ContractorProjectRecord,
  ProjectAssignment,
  ProjectRecord,
} from "./types";

const projectColumns = `
  id,
  name,
  client_label,
  country,
  start_date,
  end_date,
  status,
  currency,
  admin_notes,
  created_at,
  updated_at
`;

const assignmentColumns = `
  id,
  contractor_id,
  project_id,
  hourly_rate,
  currency,
  sales_rate,
  start_date,
  end_date,
  status,
  created_at,
  updated_at
`;

export async function getProjectsForStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(projectColumns)
    .order("name", { ascending: true })
    .returns<ProjectRecord[]>();

  if (error) {
    throw new Error(`Could not load projects: ${error.message}`);
  }

  return data;
}

export async function getProjectById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(projectColumns)
    .eq("id", id)
    .maybeSingle<ProjectRecord>();

  if (error) {
    throw new Error(`Could not load project: ${error.message}`);
  }

  return data;
}

export async function getAssignmentsForProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractor_projects")
    .select(assignmentColumns)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .returns<ContractorProjectRecord[]>();

  if (error) {
    throw new Error(`Could not load project assignments: ${error.message}`);
  }

  return hydrateAssignments(data);
}

export async function getAssignmentsForContractor(contractorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractor_projects")
    .select(assignmentColumns)
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: true })
    .returns<ContractorProjectRecord[]>();

  if (error) {
    throw new Error(`Could not load contractor assignments: ${error.message}`);
  }

  return hydrateAssignments(data);
}

async function hydrateAssignments(assignments: ContractorProjectRecord[]) {
  if (assignments.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const contractorIds = [...new Set(assignments.map((assignment) => assignment.contractor_id))];
  const projectIds = [...new Set(assignments.map((assignment) => assignment.project_id))];

  const [contractorResult, projectResult] = await Promise.all([
    supabase
      .from("contractors")
      .select("id,legal_name,email,status")
      .in("id", contractorIds)
      .returns<Pick<ContractorRecord, "id" | "legal_name" | "email" | "status">[]>(),
    supabase
      .from("projects")
      .select("id,name,client_label,status")
      .in("id", projectIds)
      .returns<AssignmentProjectSummary[]>(),
  ]);

  if (contractorResult.error) {
    throw new Error(`Could not load assignment contractors: ${contractorResult.error.message}`);
  }

  if (projectResult.error) {
    throw new Error(`Could not load assignment projects: ${projectResult.error.message}`);
  }

  const contractors = new Map<string, AssignmentContractorSummary>(
    contractorResult.data.map((contractor) => [contractor.id, contractor]),
  );
  const projects = new Map<string, AssignmentProjectSummary>(
    projectResult.data.map((project) => [project.id, project]),
  );

  return assignments.map<ProjectAssignment>((assignment) => ({
    ...assignment,
    contractor: contractors.get(assignment.contractor_id) ?? null,
    project: projects.get(assignment.project_id) ?? null,
  }));
}
