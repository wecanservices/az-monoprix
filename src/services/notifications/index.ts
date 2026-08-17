import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Notifications service.
 *
 * Phase 6 implements in-app notifications (persisted in DB + Realtime).
 * Push (FCM/Web Push) hooks are stubbed — the `sendPush()` helper is a
 * no-op unless a provider is configured (branchable in Phase 8+).
 */

export type NotifChannel = "push" | "sms" | "email" | "in_app";

export interface NotifInput {
  user_id: string;
  channel?: NotifChannel;
  title: string;
  body?: string | null;
  link_url?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createNotification(sb: SupabaseClient, n: NotifInput) {
  const { data, error } = await sb
    .from("notifications")
    .insert({
      user_id: n.user_id,
      channel: n.channel ?? "in_app",
      title: n.title,
      body: n.body ?? null,
      link_url: n.link_url ?? null,
      metadata: n.metadata ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listUserNotifications(sb: SupabaseClient, userId: string, limit = 30) {
  const { data, error } = await sb
    .from("notifications")
    .select("id, title, body, link_url, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countUnread(sb: SupabaseClient, userId: string) {
  const { count } = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markRead(sb: SupabaseClient, userId: string, id?: string) {
  const q = sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId);
  const { error } = id ? await q.eq("id", id) : await q.is("read_at", null);
  if (error) throw error;
}

/**
 * Broadcast a notification to every user matching a segment.
 * Segments map onto `v_customer_segments.segment`.
 */
export async function broadcastToSegment(
  sb: SupabaseClient,
  segment: string,
  message: { title: string; body?: string; link_url?: string },
) {
  const { data } = await sb.from("v_customer_segments").select("id").eq("segment", segment);
  const ids = (data ?? []).map((r) => r.id);
  if (ids.length === 0) return { sent: 0 };
  const rows = ids.map((id) => ({
    user_id: id,
    channel: "in_app" as const,
    title: message.title,
    body: message.body ?? null,
    link_url: message.link_url ?? null,
  }));
  await sb.from("notifications").insert(rows);
  return { sent: ids.length };
}
