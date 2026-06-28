"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import {
  buildAuthCallbackUrl,
  buildGeneratedAuthLink,
  buildInviteEmail,
  sendPortalEmail,
} from "@/lib/email/portal-email";
import { sendContractorNotification } from "@/lib/email/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const createContractorSchema = z.object({
  email: z.string().trim().email("Enter a valid contractor email address."),
  fullName: z
    .string()
    .trim()
    .min(1, "Enter the contractor account name.")
    .max(160, "Keep the account name under 160 characters."),
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
  fiscalAddressLine1: optionalText,
  fiscalAddressLine2: optionalText,
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
  .omit({})
  .extend({
    contractorId: z.string().uuid("Contractor is missing."),
  });

const contractorIdSchema = z.object({
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

function displayValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not set" : String(value);
}

function combineAddress(line1: string | null, line2: string | null) {
  return [line1, line2].filter(Boolean).join("\n") || null;
}

function cleanOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function changeLine(label: string, before: string | number | null | undefined, after: string | number | null | undefined) {
  if (displayValue(before) === displayValue(after)) return null;
  return `* ${label}: ${displayValue(before)} -> ${displayValue(after)}`;
}

async function notifyContractorOfAdminChange({
  contractorEmail,
  contractorName,
  subject,
  intro,
  changes,
}: {
  contractorEmail: string;
  contractorName: string;
  subject: string;
  intro: string;
  changes: string[];
}) {
  if (changes.length === 0) return true;
  return sendContractorNotification({
    to: contractorEmail,
    subject,
    body: `Hello ${contractorName},

${intro}

Changes:

${changes.join("\n")}

Updated by: ANVEL admin

You can review the latest information in the portal.`,
  });
}

async function findAuthUserByEmail(
  adminSupabase: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const targetEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(`Could not check existing auth users: ${error.message}`);
    }

    const user = data.users.find(
      (item) => item.email?.toLowerCase() === targetEmail,
    );

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }
}

export async function createContractorAction(
  _previousState: ContractorCreateState,
  formData: FormData,
): Promise<ContractorCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = createContractorSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    supplierType: formData.get("supplierType"),
    companyRegistrationNumber: formData.get("companyRegistrationNumber"),
    vatNumber: formData.get("vatNumber"),
    taxNumber: formData.get("taxNumber"),
    fiscalAddress:
      combineAddress(
        cleanOptionalText(formData.get("fiscalAddressLine1")),
        cleanOptionalText(formData.get("fiscalAddressLine2")),
      ) ?? "",
    fiscalAddressLine1: formData.get("fiscalAddressLine1"),
    fiscalAddressLine2: formData.get("fiscalAddressLine2"),
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
  let adminSupabase: ReturnType<typeof createAdminClient>;

  if (!process.env.RESEND_API_KEY) {
    return {
      message:
        "Contractor invitations are not configured. Set RESEND_API_KEY before creating accounts.",
      status: "error",
      fieldErrors: {},
    };
  }

  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    console.error("Contractor invitation service-role configuration is missing", error);
    return {
      message:
        "Contractor invitations are not configured. Set the server-only service-role key before creating accounts.",
      status: "error",
      fieldErrors: {},
    };
  }

  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");
  const redirectTo = buildAuthCallbackUrl(requestOrigin);
  const existingAuthUser = await findAuthUserByEmail(
    adminSupabase,
    parsed.data.email,
  );

  const inviteResult = existingAuthUser
    ? await adminSupabase.auth.admin.generateLink({
        type: "recovery",
        email: parsed.data.email,
        options: {
          redirectTo,
        },
      })
    : await adminSupabase.auth.admin.generateLink({
        type: "invite",
        email: parsed.data.email,
        options: {
          data: {
            full_name: parsed.data.fullName,
            role: "contractor",
          },
          redirectTo,
        },
      });

  const invitedUser = inviteResult.data.user ?? existingAuthUser;

  if (inviteResult.error || !invitedUser) {
    return {
      message:
        inviteResult.error?.message ??
        "Could not create the contractor portal invitation.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(
    invitedUser.id,
    {
      email: parsed.data.email,
      user_metadata: {
        full_name: parsed.data.fullName,
        role: "contractor",
      },
    },
  );

  if (authUpdateError) {
    if (!existingAuthUser) {
      await adminSupabase.auth.admin.deleteUser(invitedUser.id);
    }

    return {
      message: `Could not update the contractor auth account: ${authUpdateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const actionLink = buildGeneratedAuthLink(
    inviteResult.data.properties,
    existingAuthUser ? "recovery" : "invite",
    requestOrigin,
  );

  if (!actionLink) {
    if (!existingAuthUser) {
      await adminSupabase.auth.admin.deleteUser(invitedUser.id);
    }

    return {
      message: "Could not prepare the contractor invitation email.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: profileUpsertError } = await supabase.from("profiles").upsert(
    {
      id: invitedUser.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role: "contractor",
      is_active: true,
    },
    {
      onConflict: "id",
    },
  );

  if (profileUpsertError) {
    if (!existingAuthUser) {
      await adminSupabase.auth.admin.deleteUser(invitedUser.id);
    }

    return {
      message: `The auth account exists, but the profile row could not be saved: ${profileUpsertError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const contractorPayload = {
    profile_id: invitedUser.id,
    legal_name: parsed.data.legalName,
    trading_name: parsed.data.tradingName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    country: parsed.data.country,
    supplier_type: parsed.data.supplierType,
    company_registration_number: parsed.data.companyRegistrationNumber,
    vat_number: parsed.data.vatNumber,
    tax_number: parsed.data.taxNumber,
    fiscal_address: parsed.data.fiscalAddress,
    fiscal_address_line_1: parsed.data.fiscalAddressLine1,
    fiscal_address_line_2: parsed.data.fiscalAddressLine2,
    vat_treatment: parsed.data.vatTreatment,
    bank_currency: "EUR",
    status: parsed.data.status,
  };

  const { data: existingContractor, error: existingContractorError } =
    await supabase
      .from("contractors")
      .select("id")
      .or(`profile_id.eq.${invitedUser.id},email.eq.${parsed.data.email}`)
      .maybeSingle<{ id: string }>();

  if (existingContractorError) {
    return {
      message: `Could not check existing contractor records: ${existingContractorError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const contractorResult = existingContractor
    ? await supabase
        .from("contractors")
        .update(contractorPayload)
        .eq("id", existingContractor.id)
        .select("id")
        .single<{ id: string }>()
    : await supabase
        .from("contractors")
        .insert(contractorPayload)
        .select("id")
        .single<{ id: string }>();

  const contractor = contractorResult.data;
  const error = contractorResult.error;

  if (error || !contractor) {
    if (!existingAuthUser) {
      await supabase.from("profiles").delete().eq("id", invitedUser.id);
      await adminSupabase.auth.admin.deleteUser(invitedUser.id);
    }

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
      profile_id: invitedUser.id,
      email: parsed.data.email,
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

  revalidatePath("/");
  revalidatePath("/contractors");
  revalidatePath(`/contractors/${contractor.id}`);

  try {
    const email = buildInviteEmail(parsed.data.fullName, actionLink);
    await sendPortalEmail({
      to: parsed.data.email,
      ...email,
    });
  } catch (error) {
    console.error("Contractor invitation email failed", error);
    return {
      message:
        "Contractor account was created, but Resend could not send the invitation. Check RESEND_API_KEY, PORTAL_EMAIL_FROM and Resend domain verification, then use Resend invite from the contractor profile.",
      status: "error",
      fieldErrors: {},
    };
  }

  redirect(`/contractors/${contractor.id}`);
}

export async function updateContractorAction(
  _previousState: ContractorCreateState,
  formData: FormData,
): Promise<ContractorCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = updateContractorSchema.safeParse({
    contractorId: formData.get("contractorId"),
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    supplierType: formData.get("supplierType"),
    companyRegistrationNumber: formData.get("companyRegistrationNumber"),
    vatNumber: formData.get("vatNumber"),
    taxNumber: formData.get("taxNumber"),
    fiscalAddress:
      combineAddress(
        cleanOptionalText(formData.get("fiscalAddressLine1")),
        cleanOptionalText(formData.get("fiscalAddressLine2")),
      ) ?? "",
    fiscalAddressLine1: formData.get("fiscalAddressLine1"),
    fiscalAddressLine2: formData.get("fiscalAddressLine2"),
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
        "profile_id",
        "email",
        "legal_name",
        "trading_name",
        "phone",
        "country",
        "supplier_type",
        "company_registration_number",
        "vat_number",
        "tax_number",
        "fiscal_address",
        "fiscal_address_line_1",
        "fiscal_address_line_2",
        "vat_treatment",
        "status",
      ].join(","),
    )
    .eq("id", parsed.data.contractorId)
    .maybeSingle<{
      id: string;
      profile_id: string | null;
      email: string;
      legal_name: string;
      trading_name: string | null;
      phone: string | null;
      country: string | null;
      supplier_type: string | null;
      company_registration_number: string | null;
      vat_number: string | null;
      tax_number: string | null;
      fiscal_address: string | null;
      fiscal_address_line_1: string | null;
      fiscal_address_line_2: string | null;
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
    email: parsed.data.email,
    legal_name: parsed.data.legalName,
    trading_name: parsed.data.tradingName,
    phone: parsed.data.phone,
    country: parsed.data.country,
    supplier_type: parsed.data.supplierType,
    company_registration_number: parsed.data.companyRegistrationNumber,
    vat_number: parsed.data.vatNumber,
    tax_number: parsed.data.taxNumber,
    fiscal_address: parsed.data.fiscalAddress,
    fiscal_address_line_1: parsed.data.fiscalAddressLine1,
    fiscal_address_line_2: parsed.data.fiscalAddressLine2,
    vat_treatment: parsed.data.vatTreatment,
    status: parsed.data.status,
  };

  if (currentContractor.profile_id) {
    const adminSupabase = createAdminClient();
    const { error: authUpdateError } =
      await adminSupabase.auth.admin.updateUserById(
        currentContractor.profile_id,
        {
          email: parsed.data.email,
          user_metadata: {
            full_name: parsed.data.fullName,
            role: "contractor",
          },
        },
      );

    if (authUpdateError) {
      return {
        message: `Could not update the contractor login account: ${authUpdateError.message}`,
        status: "error",
        fieldErrors: {},
      };
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        email: parsed.data.email,
        full_name: parsed.data.fullName,
        role: "contractor",
        is_active: parsed.data.status !== "offboarded",
      })
      .eq("id", currentContractor.profile_id);

    if (profileUpdateError) {
      return {
        message: `Could not update the contractor profile account: ${profileUpdateError.message}`,
        status: "error",
        fieldErrors: {},
      };
    }
  }

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
        email: currentContractor.email,
        trading_name: currentContractor.trading_name,
        phone: currentContractor.phone,
        country: currentContractor.country,
        supplier_type: currentContractor.supplier_type,
        company_registration_number:
          currentContractor.company_registration_number,
        vat_number: currentContractor.vat_number,
        tax_number: currentContractor.tax_number,
        fiscal_address: currentContractor.fiscal_address,
        fiscal_address_line_1: currentContractor.fiscal_address_line_1,
        fiscal_address_line_2: currentContractor.fiscal_address_line_2,
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

  const notified = await notifyContractorOfAdminChange({
    contractorEmail: parsed.data.email,
    contractorName: parsed.data.legalName,
    subject: "Your contractor details were updated",
    intro: "An ANVEL admin updated your contractor details.",
    changes: [
      changeLine("Legal name", currentContractor.legal_name, nextContractor.legal_name),
      changeLine("Email", currentContractor.email, nextContractor.email),
      changeLine("Trading name", currentContractor.trading_name, nextContractor.trading_name),
      changeLine("Phone", currentContractor.phone, nextContractor.phone),
      changeLine("Country", currentContractor.country, nextContractor.country),
      changeLine("Supplier type", currentContractor.supplier_type, nextContractor.supplier_type),
      changeLine("Company registration number", currentContractor.company_registration_number, nextContractor.company_registration_number),
      changeLine("VAT number", currentContractor.vat_number, nextContractor.vat_number),
      changeLine("Fiscal address", currentContractor.fiscal_address, nextContractor.fiscal_address),
      changeLine("VAT treatment", currentContractor.vat_treatment, nextContractor.vat_treatment),
      changeLine("Status", currentContractor.status, nextContractor.status),
    ].filter((line): line is string => Boolean(line)),
  });

  revalidatePath(`/contractors/${currentContractor.id}`);
  revalidatePath("/contractors");
  revalidatePath("/profile");

  return {
    message: notified
      ? "Contractor updated."
      : "Contractor updated, but the contractor notification email failed.",
    status: "success",
    fieldErrors: {},
  };
}

export async function offboardContractorAction(
  _previousState: ContractorCreateState,
  formData: FormData,
): Promise<ContractorCreateState> {
  const profile = await requireRole(["admin"]);
  const parsed = contractorIdSchema.safeParse({
    contractorId: formData.get("contractorId"),
  });

  if (!parsed.success) {
    return {
      message: "Contractor is missing.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: contractor, error: loadError } = await supabase
    .from("contractors")
    .select("id,profile_id,status,legal_name,email")
    .eq("id", parsed.data.contractorId)
    .maybeSingle<{
      id: string;
      profile_id: string | null;
      status: string;
      legal_name: string;
      email: string;
    }>();

  if (loadError || !contractor) {
    return {
      message: "This contractor could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: updateError } = await supabase
    .from("contractors")
    .update({ status: "offboarded" })
    .eq("id", contractor.id);

  if (updateError) {
    return {
      message: `Could not offboard the contractor: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  if (contractor.profile_id) {
    const adminSupabase = createAdminClient();
    const [{ error: profileError }, { error: authError }] = await Promise.all([
      supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", contractor.profile_id),
      adminSupabase.auth.admin.updateUserById(contractor.profile_id, {
        ban_duration: "876000h",
      }),
    ]);

    if (profileError || authError) {
      return {
        message:
          profileError?.message ??
          authError?.message ??
          "The contractor was offboarded, but account access could not be fully disabled.",
        status: "error",
        fieldErrors: {},
      };
    }
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_offboarded",
    entity_type: "contractor",
    entity_id: contractor.id,
    metadata: {
      from_status: contractor.status,
      to_status: "offboarded",
      profile_id: contractor.profile_id,
    },
  });

  if (auditError) {
    return {
      message: `Contractor offboarded, but the audit log could not be recorded: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/contractors/${contractor.id}`);
  revalidatePath("/contractors");

  const notified = await notifyContractorOfAdminChange({
    contractorEmail: contractor.email,
    contractorName: contractor.legal_name,
    subject: "Your contractor status was updated",
    intro: "An ANVEL admin updated your contractor status.",
    changes: [changeLine("Status", contractor.status, "offboarded")].filter(
      (line): line is string => Boolean(line),
    ),
  });

  return {
    message: notified
      ? "Contractor offboarded and account access disabled."
      : "Contractor offboarded, but the contractor notification email failed.",
    status: "success",
    fieldErrors: {},
  };
}

export async function resendContractorInviteAction(
  _previousState: ContractorCreateState,
  formData: FormData,
): Promise<ContractorCreateState> {
  const profile = await requireRole(["admin"]);
  const parsed = contractorIdSchema.safeParse({
    contractorId: formData.get("contractorId"),
  });

  if (!parsed.success) {
    return {
      message: "Contractor is missing.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      message: "Branded email is not configured. Set RESEND_API_KEY before resending invites.",
      status: "error",
      fieldErrors: {},
    };
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;

  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    console.error("Resend invite service-role configuration is missing", error);
    return {
      message: "Invite links are not configured. Set the server-only service-role key.",
      status: "error",
      fieldErrors: {},
    };
  }

  const supabase = await createClient();
  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select("id,legal_name,email,status")
    .eq("id", parsed.data.contractorId)
    .maybeSingle<{
      id: string;
      legal_name: string;
      email: string;
      status: string;
    }>();

  if (contractorError || !contractor) {
    return {
      message: "This contractor could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const requestHeaders = await headers();
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email: contractor.email,
    options: {
      redirectTo: buildAuthCallbackUrl(requestHeaders.get("origin")),
    },
  });

  const inviteLink = buildGeneratedAuthLink(
    data.properties,
    "recovery",
    requestHeaders.get("origin"),
  );

  if (error || !inviteLink) {
    return {
      message: error?.message ?? "Could not prepare the invite link.",
      status: "error",
      fieldErrors: {},
    };
  }

  try {
    const email = buildInviteEmail(contractor.legal_name, inviteLink);
    await sendPortalEmail({
      to: contractor.email,
      ...email,
    });
  } catch (error) {
    console.error("Resend invite email failed", error);
    return {
      message:
        "The invite link was prepared, but Resend could not send the email. Check RESEND_API_KEY, PORTAL_EMAIL_FROM and Resend domain verification.",
      status: "error",
      fieldErrors: {},
    };
  }

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_invite_resent",
    entity_type: "contractor",
    entity_id: contractor.id,
    metadata: {
      email: contractor.email,
    },
  });

  revalidatePath(`/contractors/${contractor.id}`);

  return {
    message: "Invitation email resent.",
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
    .select("id,legal_name,email,bank_account_holder,iban,swift_bic,bank_currency")
    .eq("id", parsed.data.contractorId)
    .maybeSingle<{
      id: string;
      legal_name: string;
      email: string;
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

  const notified = await notifyContractorOfAdminChange({
    contractorEmail: currentContractor.email,
    contractorName: currentContractor.legal_name,
    subject: "Your bank details were updated",
    intro: "An ANVEL admin updated your contractor bank details.",
    changes: [
      changeLine("Account holder", currentContractor.bank_account_holder, nextBankDetails.bank_account_holder),
      changeLine("IBAN", maskIbanForAudit(currentContractor.iban), maskIbanForAudit(nextBankDetails.iban)),
      changeLine("SWIFT/BIC", currentContractor.swift_bic, nextBankDetails.swift_bic),
      changeLine("Currency", currentContractor.bank_currency, nextBankDetails.bank_currency),
    ].filter((line): line is string => Boolean(line)),
  });

  return {
    message: notified
      ? "Bank details updated."
      : "Bank details updated, but the contractor notification email failed.",
    status: "success",
    fieldErrors: {},
  };
}
