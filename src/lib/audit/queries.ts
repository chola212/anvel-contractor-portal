import { createClient } from "@/lib/supabase/server";

import type { AuditLogRecord } from "./types";

type AuditLogRow = Omit<AuditLogRecord, "actor">;

type ActorProfile = {
  id: string;
  email: string;
  full_name: string | null;
};

export async function getContractorAuditLogs(contractorId: string) {
  const supabase = await createClient();
  const { data: logs, error: logsError } = await supabase
    .from("audit_logs")
    .select("id,actor_profile_id,action,entity_type,entity_id,metadata,created_at")
    .eq("entity_type", "contractor")
    .eq("entity_id", contractorId)
    .in("action", ["contractor_created", "contractor_profile_updated"])
    .order("created_at", { ascending: false })
    .limit(25)
    .returns<AuditLogRow[]>();

  if (logsError) {
    throw new Error(`Could not load contractor audit history: ${logsError.message}`);
  }

  const actorIds = [
    ...new Set(
      logs
        .map((log) => log.actor_profile_id)
        .filter((actorId): actorId is string => Boolean(actorId)),
    ),
  ];

  if (actorIds.length === 0) {
    return logs.map((log) => ({ ...log, actor: null }));
  }

  const { data: actors, error: actorsError } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .in("id", actorIds)
    .returns<ActorProfile[]>();

  if (actorsError) {
    throw new Error(`Could not load audit actors: ${actorsError.message}`);
  }

  const actorsById = new Map(actors.map((actor) => [actor.id, actor]));

  return logs.map((log) => {
    const actor = log.actor_profile_id
      ? actorsById.get(log.actor_profile_id)
      : null;

    return {
      ...log,
      actor: actor
        ? {
            email: actor.email,
            full_name: actor.full_name,
          }
        : null,
    };
  });
}
