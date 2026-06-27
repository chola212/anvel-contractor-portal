import { createClient } from "@/lib/supabase/server";

import type {
  ContractorDocument,
  ContractorDocumentRecord,
  DocumentContractorSummary,
  DocumentRequirementRecord,
} from "./types";
import { contractorDocumentRequirementNames } from "./requirements";

const documentColumns = `
  id,
  contractor_id,
  document_requirement_id,
  document_type,
  file_path,
  file_name,
  mime_type,
  file_size_bytes,
  status,
  expiry_date,
  reviewed_by,
  reviewed_at,
  review_comment,
  created_at,
  updated_at
`;

export type DocumentFilters = {
  status?: string;
  documentType?: string;
  uploadedMonth?: string;
};

function monthStart(value: string) {
  return `${value}-01T00:00:00.000Z`;
}

function monthEnd(value: string) {
  const [year, month] = value.split("-").map(Number);
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${value}-${String(endDay).padStart(2, "0")}T23:59:59.999Z`;
}

type DocumentFilterableQuery<T> = T & {
  eq(column: string, value: string): DocumentFilterableQuery<T>;
  gte(column: string, value: string): DocumentFilterableQuery<T>;
  lte(column: string, value: string): DocumentFilterableQuery<T>;
};

function applyDocumentFilters<T>(
  query: T,
  filters: DocumentFilters = {},
) {
  let nextQuery = query as DocumentFilterableQuery<T>;

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }

  if (filters.documentType) {
    nextQuery = nextQuery.eq("document_type", filters.documentType);
  }

  if (filters.uploadedMonth) {
    nextQuery = nextQuery
      .gte("created_at", monthStart(filters.uploadedMonth))
      .lte("created_at", monthEnd(filters.uploadedMonth));
  }

  return nextQuery as T;
}

export async function getDocumentsForStaff(filters: DocumentFilters = {}) {
  const supabase = await createClient();
  const { data, error } = await applyDocumentFilters(
    supabase
    .from("contractor_documents")
      .select(documentColumns),
    filters,
  )
    .order("created_at", { ascending: false })
    .returns<ContractorDocumentRecord[]>();

  if (error) {
    throw new Error(`Could not load contractor documents: ${error.message}`);
  }

  return hydrateDocuments(data);
}

export async function getDocumentsForContractor(
  contractorId: string,
  filters: DocumentFilters = {},
) {
  const supabase = await createClient();
  const { data, error } = await applyDocumentFilters(
    supabase
    .from("contractor_documents")
    .select(documentColumns)
      .eq("contractor_id", contractorId),
    filters,
  )
    .order("created_at", { ascending: false })
    .returns<ContractorDocumentRecord[]>();

  if (error) {
    throw new Error(`Could not load contractor documents: ${error.message}`);
  }

  return hydrateDocuments(data);
}

export async function getDocumentRequirementsForContractor(
  supplierType: string | null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requirements")
    .select("id,supplier_type,name,is_required,requires_expiry_date,created_at")
    .or(
      supplierType
        ? `supplier_type.is.null,supplier_type.eq.${supplierType}`
        : "supplier_type.is.null",
    )
    .in("name", [...contractorDocumentRequirementNames])
    .order("is_required", { ascending: false })
    .order("name", { ascending: true })
    .returns<DocumentRequirementRecord[]>();

  if (error) {
    throw new Error(`Could not load document requirements: ${error.message}`);
  }

  return data;
}

export async function getAllDocumentRequirements() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requirements")
    .select("id,supplier_type,name,is_required,requires_expiry_date,created_at")
    .in("name", [...contractorDocumentRequirementNames])
    .order("is_required", { ascending: false })
    .order("name", { ascending: true })
    .returns<DocumentRequirementRecord[]>();

  if (error) {
    throw new Error(`Could not load document requirements: ${error.message}`);
  }

  return data;
}

async function hydrateDocuments(documents: ContractorDocumentRecord[]) {
  if (documents.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const contractorIds = [
    ...new Set(documents.map((document) => document.contractor_id)),
  ];
  const requirementIds = [
    ...new Set(
      documents
        .map((document) => document.document_requirement_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [contractorResult, requirementResult] = await Promise.all([
    supabase
      .from("contractors")
      .select("id,legal_name,email,status")
      .in("id", contractorIds)
      .returns<DocumentContractorSummary[]>(),
    requirementIds.length > 0
      ? supabase
          .from("document_requirements")
          .select(
            "id,supplier_type,name,is_required,requires_expiry_date,created_at",
          )
          .in("id", requirementIds)
          .returns<DocumentRequirementRecord[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (contractorResult.error) {
    throw new Error(
      `Could not load document contractors: ${contractorResult.error.message}`,
    );
  }

  if (requirementResult.error) {
    throw new Error(
      `Could not load document requirements: ${requirementResult.error.message}`,
    );
  }

  const contractors = new Map<string, DocumentContractorSummary>(
    contractorResult.data.map((contractor) => [contractor.id, contractor]),
  );
  const requirements = new Map<string, DocumentRequirementRecord>(
    requirementResult.data.map((requirement) => [requirement.id, requirement]),
  );

  return documents.map<ContractorDocument>((document) => ({
    ...document,
    contractor: contractors.get(document.contractor_id) ?? null,
    requirement: document.document_requirement_id
      ? requirements.get(document.document_requirement_id) ?? null
      : null,
  }));
}
