"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/reset-password`,
    },
  );

  if (error) {
    return {
      message: "Could not send the password reset email.",
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
