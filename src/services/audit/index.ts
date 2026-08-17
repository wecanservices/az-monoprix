import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Central helper for the `audit_log` table. Call from any admin
 * mutation that should leave a trail (price change, refund, driver
 * validation, etc.). Never blocks the caller — errors are swallowed
 * with a warn line so business flows stay resilient.
 */
export async function recordAudit(
  sb: SupabaseClient,
  input: {
    actorId?: string | null;
    action: string;         // "order.cancel", "product.update"…
    entityType: string;     // "order", "product", …
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.from("audit_log").insert({
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      before_data: input.before ?? null,
      after_data: input.after ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Non-fatal: business logic keeps going even if audit fails.
  }
}
