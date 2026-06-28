export type ContractorStatus =
  | "draft"
  | "invited"
  | "active"
  | "paused"
  | "offboarded";

export type SupplierType =
  | "limited_company"
  | "self_employed"
  | "sole_trader"
  | "other";

export type VatTreatment =
  | "eu_reverse_charge"
  | "cyprus_vat_19"
  | "non_eu_accountant_review"
  | "eu_no_vat_accountant_review";

export type ContractorRecord = {
  id: string;
  profile_id: string | null;
  legal_name: string;
  trading_name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  supplier_type: SupplierType | null;
  company_registration_number: string | null;
  vat_number: string | null;
  tax_number: string | null;
  fiscal_address: string | null;
  fiscal_address_line_1: string | null;
  fiscal_address_line_2: string | null;
  vat_treatment: VatTreatment | null;
  bank_account_holder: string | null;
  iban: string | null;
  swift_bic: string | null;
  bank_currency: string;
  status: ContractorStatus;
  created_at: string;
  updated_at: string;
};

export type AvailableContractorProfile = {
  id: string;
  email: string;
  full_name: string | null;
};
