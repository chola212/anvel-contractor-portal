"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const createContractorSchema = z.object({
  profileId: z.string().uuid("Select a contractor login profile."),
  legalName: z
    .string()
    .trim()
    .min(1, "Enter the legal name.")
    .max(160, "Keep the legal name under 160 characters."),
  tradingName: optionalText,
  phone: optionalText,
  country: optionalText,
  supplierType: z
    .enum(["limited_company", "self_employed", "sole_trader", "other"], {
      message: "Select a valid supplier type.",
    })
    .nullable()
    .or(z.literal("").transform(() => null)),
  companyRegistrationNumber: optionalText,
  vatNumber: optionalText,
  taxNumber: optionalText,
  fiscalAddress: optionalText,
  vatTreatment: z
    .enum([
      "eu_reverse_charge",
      "cyprus_vat_19",
      "non_eu_accountant_review",
      "eu_no_vat_accountant_review",
    ], {
      message: "Select a valid VAT treatment.",
    })
    .nullable()
    .or(z.literal("").transform(() => null)),
  status: z.enum(["draft", "invited", "active", "paused", "offboarded"], {
    message: "Select a valid contractor status.",
  }),
});

const updateContractorSchema = createContractorSchema
  .omit({ profileId: true })
  .extend({
    contractorId: z.string().uuid("Contractor is missing."),
  });

const bankText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const bankIban = z
  .string()
  .trim()
  .transform((value) => {
    const normalized = value.replace(/\s/g, "").toUpperCase();

    return normalized.length > 0 ? normalized : null;
  })
  .refine((value) => value === null || /^[A-Z]{2}[A-Z0-9]{13,32}$/.test(value), {
    message: "Enter a valid IBAN format, for example CY followed by bank digits.",
  });

const bankSwiftBic = z
  .string()
  .trim()
  .transform((value) => {
    const normalized = value.replace(/\s/g, "").toUpperCase();

    return normalized.length > 0 ? normalized : null;
  })
  .refine((value) => value === null || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(value), {
    message: "Enter an 8 or 11 character SWIFT/BIC code.",
  });

const updateContractorBankSchema = z.object({
  contractorId: z.string().uuid("Contractor is missing."),
  bankAccountHolder: bankText,
  iban: bankIban,
  swiftBic: bankSwiftBic,
});

export type ContractorCreateState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

function maskIbanForAudit(value: string | null) {
  if (!value) {
    return null;
  }

  return `ending ${value.replace(/\s/g, "").slice(-4)}`;
}

export async function createContractorAction(
  _previousState: ContractorCreateState,
  formData: FormData,
): Promise<ContractorCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = createContractorSchema.safeParse({
    profileId: formData.get("profileId"),
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    supplierType: formData.get("supplierType"),
    companyRegistrationNumber: formData.get("companyRegistrationNumber"),
    vatNumber: formData.get("vatNumber"),
    taxNumber: formData.get("taxNumber"),
    fiscalAddress: formData.get("fiscalAddress"),
    vatTreatment: formData.get("vatTreatment"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      message: "Check the contractor details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: loginProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,role,is_active")
    .eq("id", parsed.data.profileId)
    .maybeSingle<{
      id: string;
      email: string;
      role: string;
      is_active: boolean;
    }>();

  if (
    profileError ||
    !loginProfile ||
    loginProfile.role !== "contractor" ||
    !loginProfile.is_active
  ) {
    return {
      message: "Select an active contractor login profile.",
      status: "error",
      fieldErrors: {
        profileId: ["Select an active contractor login profile."],
      },
    };
  }

  const { data: contractor, error } = await supabase
    .from("contractors")
    .insert({
      profile_id: parsed.data.profileId,
      legal_name: parsed.data.legalName,
      trading_name: parsed.data.tradingName,
      email: loginProfile.email,
      phone: parsed.data.phone,
      country: parsed.data.country,
      supplier_type: parsed.data.supplierType,
      company_registration_number: parsed.data.companyRegistrationNumber,
      vat_number: parsed.data.vatNumber,
      tax_number: parsed.data.taxNumber,
      fiscal_address: parsed.data.fiscalAddress,
      vat_treatment: parsed.data.vatTreatment,
      bank_currency: "EUR",
      status: parsed.data.status,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !contractor) {
    return {
      message:
        error?.code === "23505"
          ? "This login profile is already linked to a contractor."
          : error?.code === "23514"
            ? "Contractor details do not match the database rules."
            : `Could not create the contractor: ${error?.message ?? "Unknown error"}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_created",
    entity_type: "contractor",
    entity_id: contractor.id,
    metadata: {
      profile_id: parsed.data.profileId,
      status: parsed.data.status,
    },
  });

  if (auditError) {
    return {
      message: `Contractor created, but the audit log could not be recorded: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/contractors");
  redirect(`/contractors/${contractor.id}`);
}

export async function updateContractorAction(
  _previousState: ContractorCreateState,
  formData: FormData,
): Promise<ContractorCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = updateContractorSchema.safeParse({
    contractorId: formData.get("contractorId"),
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    supplierType: formData.get("supplierType"),
    companyRegistrationNumber: formData.get("companyRegistrationNumber"),
    vatNumber: formData.get("vatNumber"),
    taxNumber: formData.get("taxNumber"),
    fiscalAddress: formData.get("fiscalAddress"),
    vatTreatment: formData.get("vatTreatment"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      message: "Check the contractor details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: currentContractor, error: loadError } = await supabase
    .from("contractors")
    .select(
      [
        "id",
        "legal_name",
        "trading_name",
        "phone",
        "country",
        "supplier_type",
        "company_registration_number",
        "vat_number",
        "tax_number",
        "fiscal_address",
        "vat_treatment",
        "status",
      ].join(","),
    )
    .eq("id", parsed.data.contractorId)
    .maybeSingle<{
      id: string;
      legal_name: string;
      trading_name: string | null;
      phone: string | null;
      country: string | null;
      supplier_type: string | null;
      company_registration_number: string | null;
      vat_number: string | null;
      tax_number: string | null;
      fiscal_address: string | null;
      vat_treatment: string | null;
      status: string;
    }>();

  if (loadError || !currentContractor) {
    return {
      message: "This contractor could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const nextContractor = {
    legal_name: parsed.data.legalName,
    trading_name: parsed.data.tradingName,
    phone: parsed.data.phone,
    country: parsed.data.country,
    supplier_type: parsed.data.supplierType,
    company_registration_number: parsed.data.companyRegistrationNumber,
    vat_number: parsed.data.vatNumber,
    tax_number: parsed.data.taxNumber,
    fiscal_address: parsed.data.fiscalAddress,
    vat_treatment: parsed.data.vatTreatment,
    status: parsed.data.status,
  };

  const { error: updateError } = await supabase
    .from("contractors")
    .update(nextContractor)
    .eq("id", currentContractor.id);

  if (updateError) {
    return {
      message:
        updateError.code === "23514"
          ? "Contractor details do not match the database rules."
          : `Could not update the contractor: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_profile_updated",
    entity_type: "contractor",
    entity_id: currentContractor.id,
    metadata: {
      before: {
        legal_name: currentContractor.legal_name,
        trading_name: currentContractor.trading_name,
        phone: currentContractor.phone,
        country: currentContractor.country,
        supplier_type: currentContractor.supplier_type,
        company_registration_number:
          currentContractor.company_registration_number,
        vat_number: currentContractor.vat_number,
        tax_number: currentContractor.tax_number,
        fiscal_address: currentContractor.fiscal_address,
        vat_treatment: currentContractor.vat_treatment,
        status: currentContractor.status,
      },
      after: nextContractor,
    },
  });

  if (auditError) {
    return {
      message: `Contractor updated, but the audit log could not be recorded: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/contractors/${currentContractor.id}`);
  revalidatePath("/contractors");
  revalidatePath("/profile");

  return {
    message: "Contractor updated.",
    status: "success",
    fieldErrors: {},
  };
}

export async function updateContractorBankDetailsAction(
  _previousState: ContractorCreateState,
  formData: FormData,
): Promise<ContractorCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = updateContractorBankSchema.safeParse({
    contractorId: formData.get("contractorId"),
    bankAccountHolder: formData.get("bankAccountHolder"),
    iban: formData.get("iban"),
    swiftBic: formData.get("swiftBic"),
  });

  if (!parsed.success) {
    return {
      message: "Check the bank details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (
    (parsed.data.iban || parsed.data.swiftBic) &&
    !parsed.data.bankAccountHolder
  ) {
    return {
      message: "Bank details need an account holder.",
      status: "error",
      fieldErrors: {
        bankAccountHolder: ["Enter the bank account holder."],
      },
    };
  }

  const supabase = await createClient();
  const { data: currentContractor, error: loadError } = await supabase
    .from("contractors")
    .select("id,bank_account_holder,iban,swift_bic,bank_currency")
    .eq("id", parsed.data.contractorId)
    .maybeSingle<{
      id: string;
      bank_account_holder: string | null;
      iban: string | null;
      swift_bic: string | null;
      bank_currency: string;
    }>();

  if (loadError || !currentContractor) {
    return {
      message: "This contractor could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const nextBankDetails = {
    bank_account_holder: parsed.data.bankAccountHolder,
    iban: parsed.data.iban,
    swift_bic: parsed.data.swiftBic,
    bank_currency: "EUR",
  };

  const { error: updateError } = await supabase
    .from("contractors")
    .update(nextBankDetails)
    .eq("id", currentContractor.id);

  if (updateError) {
    return {
      message:
        updateError.code === "23514"
          ? "Bank details do not match the database rules."
          : `Could not update the bank details: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_bank_details_updated",
    entity_type: "contractor",
    entity_id: currentContractor.id,
    metadata: {
      before: {
        bank_account_holder: currentContractor.bank_account_holder,
        iban_mask: maskIbanForAudit(currentContractor.iban),
        swift_bic: currentContractor.swift_bic,
        bank_currency: currentContractor.bank_currency,
      },
      after: {
        bank_account_holder: nextBankDetails.bank_account_holder,
        iban_mask: maskIbanForAudit(nextBankDetails.iban),
        swift_bic: nextBankDetails.swift_bic,
        bank_currency: nextBankDetails.bank_currency,
      },
    },
  });

  if (auditError) {
    return {
      message: `Bank details updated, but the audit log could not be recorded: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/contractors/${currentContractor.id}`);
  revalidatePath("/contractors");

  return {
    message: "Bank details updated.",
    status: "success",
    fieldErrors: {},
  };
}
