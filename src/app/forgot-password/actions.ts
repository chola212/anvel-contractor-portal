"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { buildAuthCallbackUrl, buildPasswordResetEmail, sendPortalEmail } from "@/lib/email/portal-email";
import { createAdminClient } from "@/lib/supabase/admin";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export type ForgotPasswordState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: {
    email?: string[];
  };
};

export async function forgotPasswordAction(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      message: "Check the email address and try again.",
      status: "error",
      fieldErrors: {
        email: parsed.error.flatten().fieldErrors.email,
      },
    };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (!origin) {
    return {
      message: "Could not prepare a password reset link.",
      status: "error",
      fieldErrors: {},
    };
  }

  const redirectTo = buildAuthCallbackUrl(origin);

  if (!process.env.RESEND_API_KEY) {
    console.error("Password reset email provider is not configured");
    return {
      message: "Password reset email is not configured. Contact ANVEL support.",
      status: "error",
      fieldErrors: {},
    };
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;

  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    console.error("Password reset service-role configuration is missing", error);
    return {
      message: "Password reset email is not configured. Contact ANVEL support.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
    options: {
      redirectTo,
    },
  });

  if (error || !data.properties?.action_link) {
    console.error(
      "Password reset link generation failed",
      error?.message ?? "Missing action link",
    );
    return {
      message: "Could not prepare the password reset email. Contact ANVEL support.",
      status: "error",
      fieldErrors: {},
    };
  }

  try {
    const email = buildPasswordResetEmail(data.properties.action_link);
    await sendPortalEmail({
      to: parsed.data.email,
      ...email,
    });
  } catch (error) {
    console.error("Password reset email provider failed", error);
    return {
      message: "Could not send the password reset email. Contact ANVEL support.",
      status: "error",
      fieldErrors: {},
    };
  }

  return {
    message:
      "If this email exists in the portal, a password reset link has been sent.",
    status: "success",
    fieldErrors: {},
  };
}
