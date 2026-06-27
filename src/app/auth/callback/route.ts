import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/reset-password";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash =
    requestUrl.searchParams.get("token_hash") ??
    requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));
  const redirectUrl = request.nextUrl.clone();

  console.info("Auth callback received", {
    queryParamNames: [...requestUrl.searchParams.keys()].sort(),
    verificationPath: code
      ? "code"
      : tokenHash && type
        ? "token_hash"
        : "missing",
  });

  redirectUrl.pathname = next;
  redirectUrl.search = "";

  if (errorDescription) {
    redirectUrl.searchParams.set(
      "message",
      "This link is invalid or has expired. Request a new link and try again.",
    );

    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        })
      : {
          error: new Error("Missing auth callback token."),
        };

  console.info("Auth callback verification completed", {
    verificationPath: code ? "code" : "token_hash",
    succeeded: !result.error,
  });

  if (result.error) {
    console.error("Auth callback failed", result.error);
    redirectUrl.searchParams.set(
      "message",
      "This link is invalid or has expired. Request a new link and try again.",
    );
  }

  return NextResponse.redirect(redirectUrl);
}
