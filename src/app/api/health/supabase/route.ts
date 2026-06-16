import { NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { supabaseUrl } = getSupabaseConfig();
  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();

  return NextResponse.json({
    ok: !error,
    supabaseUrlConfigured: Boolean(supabaseUrl),
    authClientReady: !error,
    error: error?.message ?? null,
  });
}
