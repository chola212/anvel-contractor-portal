"use server";

import { headers } from "next/headers";
import { z } from "zod";

import {
  buildAuthCallbackUrl,
  buildGeneratedAuthLink,
  buildPasswordResetEmail,
  sendPortalEmail,
} from "@/lib/email/portal-email";
import { createAdminClient } from "@/lib/supabase/admin";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const neutralResetMessage =
  "If this email exists in the portal, a password reset link has been sent.";

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

  let redirectTo: string;
  try {
    redirectTo = buildAuthCallbackUrl(origin);
  } catch (error) {
    console.error("Password reset URL configuration failed", error);
    return {
      message: neutralResetMessage,
      status: "success",
      fieldErrors: {},
    };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Password reset email provider is not configured");
    return {
      message: neutralResetMessage,
      status: "success",
      fieldErrors: {},
    };
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;

  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    console.error("Password reset service-role configuration is missing", error);
    return {
      message: neutralResetMessage,
      status: "success",
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

  const resetLink = buildGeneratedAuthLink(
    data.properties,
    "recovery",
    origin,
  );

  if (error || !resetLink) {
    console.error(
      "Password reset link generation failed",
      error?.message ?? "Missing action link",
    );
    return {
      message: neutralResetMessage,
      status: "success",
      fieldErrors: {},
    };
  }

  try {
    const email = buildPasswordResetEmail(resetLink);
    await sendPortalEmail({
      to: parsed.data.email,
      ...email,
    });
  } catch (error) {
    console.error("Password reset email provider failed", error);
    return {
      message: neutralResetMessage,
      status: "success",
      fieldErrors: {},
    };
  }

  return {
    message: neutralResetMessage,
    status: "success",
    fieldErrors: {},
  };
}
