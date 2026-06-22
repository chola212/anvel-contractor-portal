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

export type ContractorCreateState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

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
