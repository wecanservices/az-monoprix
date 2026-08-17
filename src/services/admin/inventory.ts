import type { SupabaseClient } from "@supabase/supabase-js";

export interface InventoryRow {
  store_id: string;
  product_id: string;
  on_hand: number;
  reserved: number;
  low_stock: number;
  product?: { sku: string; name_fr: string; unit: string | null };
  store?: { code: string; name: string };
}

export async function adminListInventory(
  sb: SupabaseClient,
  opts: { storeId?: string; lowOnly?: boolean; search?: string; limit?: number } = {},
): Promise<InventoryRow[]> {
  let q = sb
    .from("inventory")
    .select(
      `
      store_id, product_id, on_hand, reserved, low_stock,
      product:products(sku, name_fr, unit),
      store:stores(code, name)
    `,
    )
    .limit(opts.limit ?? 300);

  if (opts.storeId) q = q.eq("store_id", opts.storeId);
  if (opts.lowOnly) q = q.lte("on_hand", 10);

  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as unknown as InventoryRow[];
  if (opts.search && opts.search.trim().length > 1) {
    const s = opts.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.product?.sku?.toLowerCase().includes(s) ||
        r.product?.name_fr?.toLowerCase().includes(s),
    );
  }
  return rows.sort((a, b) =>
    (a.product?.name_fr ?? "").localeCompare(b.product?.name_fr ?? ""),
  );
}

/** Adjust stock : positive delta = adjust+, negative = adjust- (or loss). */
export async function adminAdjustStock(
  sb: SupabaseClient,
  storeId: string,
  productId: string,
  delta: number,
  reason: string | null,
  actorId: string,
): Promise<void> {
  const { error } = await sb.from("inventory_movements").insert({
    store_id: storeId,
    product_id: productId,
    type: delta >= 0 ? "adjust" : "loss",
    quantity: Math.abs(delta),
    reason,
    actor_id: actorId,
    reference_type: "manual",
  });
  if (error) throw error;
  // The tg_inv_movement_apply trigger updates `inventory.on_hand`.
}

export async function adminListMovements(
  sb: SupabaseClient,
  opts: { storeId?: string; productId?: string; limit?: number } = {},
) {
  let q = sb
    .from("inventory_movements")
    .select(
      `id, store_id, product_id, type, quantity, reason, reference_type, created_at,
       actor:profiles!inventory_movements_actor_id_fkey(full_name),
       product:products(sku, name_fr)`,
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.storeId) q = q.eq("store_id", opts.storeId);
  if (opts.productId) q = q.eq("product_id", opts.productId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
