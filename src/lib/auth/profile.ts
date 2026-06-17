import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import type { Profile } from "./roles";
import type { Role } from "./roles";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,is_active")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error || !data || !data.is_active) {
    return null;
  }

  return data;
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/account-required");
  }

  return profile;
}

export async function requireRole(allowedRoles: Role[]) {
  const profile = await requireCurrentProfile();

  if (!allowedRoles.includes(profile.role)) {
    redirect("/");
  }

  return profile;
}
