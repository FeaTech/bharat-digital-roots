import type { supabaseAdmin as SupabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

// Best-effort governance audit trail. Called after a privileged action
// already succeeded — a logging failure must never roll back or mask the
// action itself, so callers should not await this inline with error handling.
export async function logAudit(
  admin: typeof SupabaseAdmin,
  entry: { actorId: string; action: string; targetType: string; targetId?: string | null; detail?: Record<string, Json> },
) {
  try {
    await admin.from("audit_log").insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      detail: entry.detail ?? {},
    });
  } catch (err) {
    console.error("Failed to write audit log entry:", err);
  }
}
