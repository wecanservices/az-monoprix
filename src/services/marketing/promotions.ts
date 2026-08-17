import type { SupabaseClient } from "@supabase/supabase-js";

export interface PromotionRow {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: "percentage" | "fixed_amount" | "buy_x_get_y" | "bundle" | "free_shipping";
  value: number | null;
  min_order: number | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  banner_url: string | null;
  rules: Record<string, unknown>;
  product_count?: number;
}

export async function adminListPromotions(sb: SupabaseClient): Promise<PromotionRow[]> {
  const { data, error } = await sb
    .from("promotions")
    .select(`
      id, code, name, description, type, value, min_order,
      starts_at, ends_at, is_active, banner_url, rules,
      promotion_products(product_id)
    `)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    ...p,
    product_count: p.promotion_products?.length ?? 0,
  })) as PromotionRow[];
}

export async function adminGetPromotion(sb: SupabaseClient, id: string) {
  const { data, error } = await sb
    .from("promotions")
    .select(`
      *, promotion_products(product_id,
        product:products(id, sku, name_fr, base_price)
      )
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface PromotionInput {
  id?: string;
  code?: string | null;
  name: string;
  description?: string | null;
  type: PromotionRow["type"];
  value?: number | null;
  min_order?: number | null;
  starts_at?: string;
  ends_at?: string | null;
  is_active?: boolean;
  banner_url?: string | null;
  rules?: Record<string, unknown>;
}

export async function adminUpsertPromotion(
  sb: SupabaseClient,
  input: PromotionInput,
): Promise<string> {
  if (input.id) {
    const { error } = await sb.from("promotions").update(input).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await sb.from("promotions").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function adminSetPromotionProducts(
  sb: SupabaseClient,
  promotionId: string,
  productIds: string[],
) {
  // Naive but correct: wipe + reinsert. Table has a composite PK
  // so onConflict logic isn't worth it for small sets.
  await sb.from("promotion_products").delete().eq("promotion_id", promotionId);
  if (productIds.length === 0) return;
  const rows = productIds.map((product_id) => ({ promotion_id: promotionId, product_id }));
  const { error } = await sb.from("promotion_products").insert(rows);
  if (error) throw error;
}

export async function adminDeletePromotion(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("promotions").delete().eq("id", id);
  if (error) throw error;
}
