import { NextResponse, type NextRequest } from "next/server";

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
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));
  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname = next;
  redirectUrl.search = "";

  if (!code) {
    redirectUrl.searchParams.set(
      "message",
      "This link is invalid or has expired. Request a new link and try again.",
    );

    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.searchParams.set(
      "message",
      "This link is invalid or has expired. Request a new link and try again.",
    );
  }

  return NextResponse.redirect(redirectUrl);
}
