import type {
  ContractorStatus,
  SupplierType,
  VatTreatment,
} from "./types";

export const contractorStatusLabels: Record<ContractorStatus, string> = {
  draft: "Draft",
  invited: "Invited",
  active: "Active",
  paused: "Paused",
  offboarded: "Offboarded",
};

export const supplierTypeLabels: Record<SupplierType, string> = {
  limited_company: "Limited company",
  self_employed: "Self-employed",
  sole_trader: "Sole trader",
  other: "Other",
};

export const vatTreatmentLabels: Record<VatTreatment, string> = {
  eu_reverse_charge: "EU reverse charge",
  cyprus_vat_19: "Cyprus VAT 19%",
  non_eu_accountant_review: "Non-EU accountant review",
  eu_no_vat_accountant_review: "EU no VAT accountant review",
};

export function formatOptional(value: string | null | undefined) {
  return value?.trim() ? value : "Not provided";
}

export function maskIban(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  const compactValue = value.replace(/\s/g, "");
  const visible = compactValue.slice(-4);

  return `Ending ${visible}`;
}
