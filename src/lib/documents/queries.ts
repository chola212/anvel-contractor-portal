import { createClient } from "@/lib/supabase/server";

import type {
  ContractorDocument,
  ContractorDocumentRecord,
  DocumentContractorSummary,
  DocumentRequirementRecord,
} from "./types";

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

export async function getDocumentsForStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractor_documents")
    .select(documentColumns)
    .order("created_at", { ascending: false })
    .returns<ContractorDocumentRecord[]>();

  if (error) {
    throw new Error(`Could not load contractor documents: ${error.message}`);
  }

  return hydrateDocuments(data);
}

export async function getDocumentsForContractor(contractorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractor_documents")
    .select(documentColumns)
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: false })
    .returns<ContractorDocumentRecord[]>();

  if (error) {
    throw new Error(`Could not load contractor documents: ${error.message}`);
  }

  return hydrateDocuments(data);
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
