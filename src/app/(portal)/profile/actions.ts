"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const contractorSelfUpdateSchema = z.object({
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
});

export type ContractorSelfUpdateState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

export async function updateOwnContractorProfileAction(
  _previousState: ContractorSelfUpdateState,
  formData: FormData,
): Promise<ContractorSelfUpdateState> {
  await requireRole(["contractor"]);

  const parsed = contractorSelfUpdateSchema.safeParse({
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
  });

  if (!parsed.success) {
    return {
      message: "Check your profile details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: contractorId, error } = await supabase.rpc(
    "update_own_contractor_profile",
    {
      p_legal_name: parsed.data.legalName,
      p_trading_name: parsed.data.tradingName,
      p_phone: parsed.data.phone,
      p_country: parsed.data.country,
      p_supplier_type: parsed.data.supplierType,
      p_company_registration_number:
        parsed.data.companyRegistrationNumber,
      p_vat_number: parsed.data.vatNumber,
      p_tax_number: parsed.data.taxNumber,
      p_fiscal_address: parsed.data.fiscalAddress,
      p_vat_treatment: parsed.data.vatTreatment,
    },
  );

  if (error || !contractorId) {
    return {
      message:
        error?.code === "PGRST202"
          ? "Profile updates are temporarily unavailable. Contact an admin before trying again."
          : `Could not update your profile: ${error?.message ?? "Unknown error"}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/profile");
  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath("/contractors");

  return {
    message: "Profile updated.",
    status: "success",
    fieldErrors: {},
  };
}
