import { createClient } from "@/lib/supabase/server";

import type {
  ContractorOnboardingDocument,
  ContractorOnboardingDocumentContractorSummary,
  ContractorOnboardingDocumentRecord,
} from "./types";

const onboardingDocumentColumns = `
  id,
  contractor_id,
  document_type,
  file_name,
  file_path,
  sent_to,
  sent_at,
  created_by,
  created_at,
  metadata
`;

export async function getContractorOnboardingDocumentsForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractor_onboarding_documents")
    .select(onboardingDocumentColumns)
    .order("created_at", { ascending: false })
    .limit(60)
    .returns<ContractorOnboardingDocumentRecord[]>();

  if (error) {
    throw new Error(`Could not load onboarding documents: ${error.message}`);
  }

  return hydrateOnboardingDocuments(data);
}

export async function getContractorOnboardingDocumentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractor_onboarding_documents")
    .select(onboardingDocumentColumns)
    .eq("id", id)
    .maybeSingle<ContractorOnboardingDocumentRecord>();

  if (error) {
    throw new Error(`Could not load onboarding document: ${error.message}`);
  }

  return data;
}

async function hydrateOnboardingDocuments(
  documents: ContractorOnboardingDocumentRecord[],
) {
  if (documents.length === 0) {
    return [];
  }

  const contractorIds = [
    ...new Set(
      documents
        .map((document) => document.contractor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (contractorIds.length === 0) {
    return documents.map<ContractorOnboardingDocument>((document) => ({
      ...document,
      contractor: null,
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractors")
    .select("id,legal_name,email,status")
    .in("id", contractorIds)
    .returns<ContractorOnboardingDocumentContractorSummary[]>();

  if (error) {
    throw new Error(
      `Could not load onboarding document contractors: ${error.message}`,
    );
  }

  const contractors = new Map(data.map((contractor) => [contractor.id, contractor]));

  return documents.map<ContractorOnboardingDocument>((document) => ({
    ...document,
    contractor: document.contractor_id
      ? contractors.get(document.contractor_id) ?? null
      : null,
  }));
}
