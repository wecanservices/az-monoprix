import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Smart Basket recommendations — "Complete your cart" section.
 * No LLM in Phase 7 for this; a data-driven co-purchase heuristic
 * is faster and always correct. Uses order_items history to find
 * products frequently bought with items currently in the cart.
 */
export async function recommendForCart(
  sb: SupabaseClient,
  cartProductIds: string[],
  storeId: string,
  limit = 6,
): Promise<Array<{
  id: string; sku: string; name_fr: string; price: number;
  promo_price: number | null; image_url: string | null; unit: string | null;
  score: number;
}>> {
  if (cartProductIds.length === 0) {
    // Cold start: return featured available items.
    const { data } = await sb
      .from("products")
      .select(`
        id, sku, name_fr, unit,
        store_products!inner(store_id, price, promo_price, is_available),
        images:product_images(url, position)
      `)
      .eq("is_active", true)
      .eq("is_featured", true)
      .eq("store_products.store_id", storeId)
      .eq("store_products.is_available", true)
      .limit(limit);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => mapRow(r, 0));
  }

  // Find orders that contained one of the cart items.
  const { data: coOrderIds } = await sb
    .from("order_items")
    .select("order_id")
    .in("product_id", cartProductIds)
    .limit(500);
  const orderIds = Array.from(new Set((coOrderIds ?? []).map((r) => r.order_id))).slice(0, 200);

  if (orderIds.length === 0) {
    return recommendForCart(sb, [], storeId, limit); // Fall back to featured.
  }

  // Count co-occurrence of other products in those orders.
  const { data: siblings } = await sb
    .from("order_items")
    .select("product_id")
    .in("order_id", orderIds)
    .not("product_id", "in", `(${cartProductIds.join(",")})`);
  const counts = new Map<string, number>();
  for (const row of siblings ?? []) {
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }
  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2);

  if (ranked.length === 0) return recommendForCart(sb, [], storeId, limit);

  const { data } = await sb
    .from("products")
    .select(`
      id, sku, name_fr, unit,
      store_products!inner(store_id, price, promo_price, is_available),
      images:product_images(url, position)
    `)
    .in("id", ranked.map(([id]) => id))
    .eq("store_products.store_id", storeId)
    .eq("store_products.is_available", true);

  const scoreOf = (id: string) => counts.get(id) ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? [])
    .map((r: any) => mapRow(r, scoreOf(r.id)))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any, score: number) {
  const sp = Array.isArray(r.store_products) ? r.store_products[0] : r.store_products;
  const img = ((r.images ?? []) as { url: string; position: number }[])
    .sort((a, b) => a.position - b.position)[0]?.url ?? null;
  return {
    id: r.id,
    sku: r.sku,
    name_fr: r.name_fr,
    unit: r.unit,
    price: Number(sp?.price ?? 0),
    promo_price: sp?.promo_price != null ? Number(sp.promo_price) : null,
    image_url: img,
    score,
  };
}
