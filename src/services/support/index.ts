import type { SupabaseClient } from "@supabase/supabase-js";

export type TicketCategory =
  | "order" | "product" | "payment" | "delivery" | "driver" | "refund" | "other";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface TicketInput {
  customer_id?: string | null;
  order_id?: string | null;
  category: TicketCategory;
  subject: string;
  description?: string | null;
}

export async function createTicket(sb: SupabaseClient, input: TicketInput) {
  const { data, error } = await sb
    .from("support_tickets")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listCustomerTickets(sb: SupabaseClient, customerId: string) {
  const { data, error } = await sb
    .from("support_tickets")
    .select("id, subject, category, status, created_at, resolved_at, order_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminListTickets(
  sb: SupabaseClient,
  opts: { status?: TicketStatus } = {},
) {
  let q = sb
    .from("support_tickets")
    .select(
      `id, subject, category, status, created_at, order_id,
       customer:customers(profile:profiles(full_name, email))`,
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getTicket(sb: SupabaseClient, id: string) {
  const { data, error } = await sb
    .from("support_tickets")
    .select(
      `id, subject, description, category, status, created_at, resolved_at,
       customer_id, order_id, assigned_to,
       customer:customers(profile:profiles(full_name, email, phone)),
       messages:ticket_messages(id, body, created_at,
         sender:profiles(full_name, role))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = data;
  if (t?.messages) t.messages = t.messages.sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at));
  return t;
}

export async function addTicketMessage(
  sb: SupabaseClient,
  ticketId: string,
  senderId: string,
  body: string,
) {
  const { error } = await sb.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: senderId,
    body,
  });
  if (error) throw error;
}

export async function updateTicketStatus(
  sb: SupabaseClient,
  ticketId: string,
  status: TicketStatus,
) {
  const patch: Record<string, unknown> = { status };
  if (status === "resolved") patch.resolved_at = new Date().toISOString();
  const { error } = await sb.from("support_tickets").update(patch).eq("id", ticketId);
  if (error) throw error;
}
