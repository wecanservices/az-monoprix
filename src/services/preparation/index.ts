import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Preparation service — mark items picked / unavailable, propose
 * substitutions, move the order to READY.
 */

export async function listOrdersToPrepare(
  sb: SupabaseClient,
  storeId: string,
) {
  const { data, error } = await sb
    .from("orders")
    .select(
      `
      id, order_number, status, total, placed_at,
      scheduled_start, scheduled_end,
      customer:customers(profile:profiles(full_name, phone))
    `,
    )
    .eq("store_id", storeId)
    .in("status", ["confirmed", "preparing", "partially_available"])
    .order("placed_at");
  if (error) throw error;
  return data ?? [];
}

export async function loadOrderForPrep(sb: SupabaseClient, orderId: string) {
  const { data, error } = await sb
    .from("orders")
    .select(
      `
      id, order_number, status, store_id, total,
      customer:customers(id, profile:profiles(full_name, phone)),
      items:order_items(
        id, quantity, quantity_picked, unit_price, total,
        is_available, product_snapshot, product_id
      )
    `,
    )
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Mark an item picked (default: full requested quantity) or unavailable.
 * When unavailable + a replacement product is provided, we log an
 * `order_replacements` row for the customer to accept/refuse.
 */
export async function markItem(
  sb: SupabaseClient,
  itemId: string,
  patch: {
    picked?: number | null;
    unavailable?: boolean;
    replacementProductId?: string | null;
  },
  actorId: string,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.picked != null) updates.quantity_picked = patch.picked;
  if (patch.unavailable) {
    updates.is_available = false;
    updates.quantity_picked = 0;
  } else if (patch.unavailable === false) {
    updates.is_available = true;
  }
  if (Object.keys(updates).length > 0) {
    const { error } = await sb.from("order_items").update(updates).eq("id", itemId);
    if (error) throw error;
  }
  if (patch.replacementProductId) {
    const { data: item } = await sb
      .from("order_items")
      .select("order_id, quantity")
      .eq("id", itemId)
      .single();
    if (item) {
      await sb.from("order_replacements").insert({
        order_id: item.order_id,
        original_item_id: itemId,
        replacement_product_id: patch.replacementProductId,
        quantity: item.quantity,
        actor_id: actorId,
      });
    }
  }
}

/** Move confirmed → preparing (first pick or explicit start). */
export async function startPreparation(
  sb: SupabaseClient,
  orderId: string,
  actorId: string,
) {
  return sb.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to: "preparing",
    p_actor: actorId,
  });
}

/** Move preparing → ready (or partially_available if any item flagged). */
export async function finishPreparation(
  sb: SupabaseClient,
  orderId: string,
  actorId: string,
) {
  const { data: items } = await sb
    .from("order_items")
    .select("is_available")
    .eq("order_id", orderId);
  const anyMissing = (items ?? []).some((i) => i.is_available === false);

  return sb.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to: anyMissing ? "partially_available" : "ready",
    p_actor: actorId,
    p_reason: anyMissing ? "Some items unavailable — pending customer response" : null,
  });
}

/** Customer replies to a substitution proposal. */
export async function respondReplacement(
  sb: SupabaseClient,
  replacementId: string,
  response: "accepted" | "rejected" | "refunded",
) {
  const { error } = await sb
    .from("order_replacements")
    .update({
      customer_response: response,
      responded_at: new Date().toISOString(),
    })
    .eq("id", replacementId);
  if (error) throw error;
}
