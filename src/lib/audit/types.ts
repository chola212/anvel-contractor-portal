export type AuditLogRecord = {
  id: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: {
    email: string;
    full_name: string | null;
  } | null;
};
