import { createClient } from "@/lib/supabase/server";

import type { ContractorRecord } from "./types";

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
