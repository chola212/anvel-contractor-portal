import { createClient } from "@/lib/supabase/server";

import type {
  ProjectDocument,
  ProjectDocumentContractorSummary,
  ProjectDocumentProjectSummary,
  ProjectDocumentRecord,
  ProjectDocumentStatus,
} from "./types";

const projectDocumentColumns = `
  id,
  project_id,
  contractor_id,
  consultant_name,
  document_type,
  title,
  document_date,
  file_path,
  file_name,
  mime_type,
  file_size_bytes,
  status,
  notes,
  uploaded_by,
  created_at,
  updated_at
`;

export type ProjectDocumentFilters = {
  projectId?: string;
  contractorId?: string;
  status?: ProjectDocumentStatus;
};

type ProjectDocumentFilterableQuery<T> = T & {
  eq(column: string, value: string): ProjectDocumentFilterableQuery<T>;
};

function applyProjectDocumentFilters<T>(
  query: T,
  filters: ProjectDocumentFilters = {},
) {
  let nextQuery = query as ProjectDocumentFilterableQuery<T>;

  if (filters.projectId) {
    nextQuery = nextQuery.eq("project_id", filters.projectId);
  }

  if (filters.contractorId) {
    nextQuery = nextQuery.eq("contractor_id", filters.contractorId);
  }

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }

  return nextQuery as T;
}

export async function getProjectDocuments(
  filters: ProjectDocumentFilters = {},
) {
  const supabase = await createClient();
  const { data, error } = await applyProjectDocumentFilters(
    supabase.from("project_documents").select(projectDocumentColumns),
    filters,
  )
    .order("created_at", { ascending: false })
    .returns<ProjectDocumentRecord[]>();

  if (error) {
    throw new Error(`Could not load project documents: ${error.message}`);
  }

  return hydrateProjectDocuments(data);
}

export async function getProjectDocumentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select(projectDocumentColumns)
    .eq("id", id)
    .maybeSingle<ProjectDocumentRecord>();

  if (error) {
    throw new Error(`Could not load project document: ${error.message}`);
  }

  return data;
}

async function hydrateProjectDocuments(documents: ProjectDocumentRecord[]) {
  if (documents.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const projectIds = [
    ...new Set(documents.map((document) => document.project_id)),
  ];
  const contractorIds = [
    ...new Set(
      documents
        .map((document) => document.contractor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [projectResult, contractorResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,client_label,status")
      .in("id", projectIds)
      .returns<ProjectDocumentProjectSummary[]>(),
    contractorIds.length > 0
      ? supabase
          .from("contractors")
          .select("id,legal_name,email,status")
          .in("id", contractorIds)
          .returns<ProjectDocumentContractorSummary[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (projectResult.error) {
    throw new Error(
      `Could not load project document projects: ${projectResult.error.message}`,
    );
  }

  if (contractorResult.error) {
    throw new Error(
      `Could not load project document contractors: ${contractorResult.error.message}`,
    );
  }

  const projects = new Map<string, ProjectDocumentProjectSummary>(
    projectResult.data.map((project) => [project.id, project]),
  );
  const contractors = new Map<string, ProjectDocumentContractorSummary>(
    contractorResult.data.map((contractor) => [contractor.id, contractor]),
  );

  return documents.map<ProjectDocument>((document) => ({
    ...document,
    project: projects.get(document.project_id) ?? null,
    contractor: document.contractor_id
      ? contractors.get(document.contractor_id) ?? null
      : null,
  }));
}
