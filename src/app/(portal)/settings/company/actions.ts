"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(500);
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => value || null);

const companySettingsSchema = z.object({
  companyLegalName: requiredText("Company legal name"),
  tradingName: optionalText,
  companyAddressLine1: requiredText("Company address line 1"),
  companyAddressLine2: optionalText,
  companyCityRegion: optionalText,
  companyCountry: requiredText("Company country"),
  companyVatNumber: requiredText("Company VAT number"),
  invoiceSenderName: optionalText,
  defaultInvoiceNotes: optionalText,
  bankName: requiredText("Bank name"),
  bankAccountName: requiredText("Bank account name"),
  iban: requiredText("IBAN"),
  swiftBic: requiredText("SWIFT/BIC"),
});

function combineAddress(line1: string, line2: string | null) {
  return [line1, line2].filter(Boolean).join("\n");
}

export type CompanySettingsState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string[] | undefined>;
};

export async function saveCompanyInvoiceSettingsAction(
  _previousState: CompanySettingsState,
  formData: FormData,
): Promise<CompanySettingsState> {
  const profile = await requireRole(["admin"]);
  const parsed = companySettingsSchema.safeParse({
    companyLegalName: formData.get("companyLegalName"),
    tradingName: formData.get("tradingName"),
    companyAddressLine1: formData.get("companyAddressLine1"),
    companyAddressLine2: formData.get("companyAddressLine2"),
    companyCityRegion: formData.get("companyCityRegion"),
    companyCountry: formData.get("companyCountry"),
    companyVatNumber: formData.get("companyVatNumber"),
    invoiceSenderName: formData.get("invoiceSenderName"),
    defaultInvoiceNotes: formData.get("defaultInvoiceNotes"),
    bankName: formData.get("bankName"),
    bankAccountName: formData.get("bankAccountName"),
    iban: formData.get("iban"),
    swiftBic: formData.get("swiftBic"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the invoice settings and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const payload = {
    singleton_key: true,
    company_legal_name: parsed.data.companyLegalName,
    trading_name: parsed.data.tradingName,
    company_address: combineAddress(
      parsed.data.companyAddressLine1,
      parsed.data.companyAddressLine2,
    ),
    company_address_line_1: parsed.data.companyAddressLine1,
    company_address_line_2: parsed.data.companyAddressLine2,
    company_city_region: parsed.data.companyCityRegion,
    company_country: parsed.data.companyCountry,
    company_vat_number: parsed.data.companyVatNumber,
    invoice_sender_name: parsed.data.invoiceSenderName,
    default_invoice_notes: parsed.data.defaultInvoiceNotes,
    bank_name: parsed.data.bankName,
    bank_account_name: parsed.data.bankAccountName,
    iban: parsed.data.iban,
    swift_bic: parsed.data.swiftBic,
    default_payment_terms_days: 30,
    default_currency: "EUR",
  };
  const { data: settings, error } = await supabase
    .from("company_invoice_settings")
    .upsert(payload, { onConflict: "singleton_key" })
    .select("id")
    .single<{ id: string }>();

  if (error || !settings) {
    return {
      status: "error",
      message: `Could not save company invoice settings: ${error?.message ?? "Unknown error"}`,
      fieldErrors: {},
    };
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "company_invoice_settings_updated",
    entity_type: "company_invoice_settings",
    entity_id: settings.id,
    metadata: { default_payment_terms_days: 30, default_currency: "EUR" },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/company");
  return {
    status: "success",
    message: "Company invoice settings saved.",
    fieldErrors: {},
  };
}
