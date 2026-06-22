import { createClient } from "@/lib/supabase/server";

import type { AvailableContractorProfile, ContractorRecord } from "./types";

const contractorColumns = `
  id,
  profile_id,
  legal_name,
  trading_name,
  email,
  phone,
  country,
  supplier_type,
  company_registration_number,
  vat_number,
  tax_number,
  fiscal_address,
  vat_treatment,
  bank_account_holder,
  iban,
  swift_bic,
  bank_currency,
  status,
  created_at,
  updated_at
`;

export async function getContractorsForStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractors")
    .select(contractorColumns)
    .order("legal_name", { ascending: true })
    .returns<ContractorRecord[]>();

  if (error) {
    throw new Error(`Could not load contractors: ${error.message}`);
  }

  return data;
}

export async function getContractorById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractors")
    .select(contractorColumns)
    .eq("id", id)
    .maybeSingle<ContractorRecord>();

  if (error) {
    throw new Error(`Could not load contractor: ${error.message}`);
  }

  return data;
}

export async function getContractorByProfileId(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractors")
    .select(contractorColumns)
    .eq("profile_id", profileId)
    .maybeSingle<ContractorRecord>();

  if (error) {
    throw new Error(`Could not load contractor profile: ${error.message}`);
  }

  return data;
}

export async function getAvailableContractorProfiles() {
  const supabase = await createClient();
  const [profilesResult, contractorsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name")
      .eq("role", "contractor")
      .eq("is_active", true)
      .order("email", { ascending: true })
      .returns<AvailableContractorProfile[]>(),
    supabase
      .from("contractors")
      .select("profile_id")
      .not("profile_id", "is", null)
      .returns<{ profile_id: string | null }[]>(),
  ]);

  if (profilesResult.error) {
    throw new Error(
      `Could not load contractor profiles: ${profilesResult.error.message}`,
    );
  }

  if (contractorsResult.error) {
    throw new Error(
      `Could not load linked contractors: ${contractorsResult.error.message}`,
    );
  }

  const linkedProfileIds = new Set(
    contractorsResult.data
      .map((contractor) => contractor.profile_id)
      .filter((profileId): profileId is string => Boolean(profileId)),
  );

  return profilesResult.data.filter(
    (profile) => !linkedProfileIds.has(profile.id),
  );
}
