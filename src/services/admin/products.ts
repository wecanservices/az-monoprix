import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin CRUD for products. Uses the same `products` + `store_products`
 * + `inventory` tables as the client-facing catalog, but returns all
 * rows (including inactive) and lets the admin write.
 */

export interface AdminProductRow {
  id: string;
  sku: string;
  name_fr: string;
  category_id: string | null;
  brand_id: string | null;
  base_price: number;
  is_active: boolean;
  is_featured: boolean;
  unit: string | null;
  category?: { name_fr: string; icon: string | null } | null;
  brand?: { name: string } | null;
  store_products?: { store_id: string; price: number; promo_price: number | null; is_available: boolean }[];
  inventory?: { store_id: string; on_hand: number; reserved: number }[];
}

export async function adminListProducts(
  sb: SupabaseClient,
  opts: { search?: string; categoryId?: string; onlyInactive?: boolean; limit?: number } = {},
): Promise<AdminProductRow[]> {
  let q = sb
    .from("products")
    .select(
      `
      id, sku, name_fr, category_id, brand_id, base_price,
      is_active, is_featured, unit,
      category:categories(name_fr, icon),
      brand:brands(name),
      store_products(store_id, price, promo_price, is_available),
      inventory(store_id, on_hand, reserved)
    `,
    )
    .order("name_fr")
    .limit(opts.limit ?? 200);

  if (opts.search && opts.search.trim().length > 1) {
    q = q.or(`name_fr.ilike.%${opts.search}%,sku.ilike.%${opts.search}%`);
  }
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.onlyInactive) q = q.eq("is_active", false);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AdminProductRow[];
}

export async function adminGetProduct(
  sb: SupabaseClient,
  id: string,
): Promise<AdminProductRow | null> {
  const { data, error } = await sb
    .from("products")
    .select(
      `
      id, sku, name_fr, name_ar, name_en,
      description_fr, description_ar, description_en,
      category_id, brand_id, base_price, tva_rate,
      unit, unit_size, weight_grams, is_active, is_featured, attributes,
      category:categories(id, name_fr, icon),
      brand:brands(id, name),
      images:product_images(id, url, position),
      store_products(store_id, price, promo_price, is_available),
      inventory(store_id, on_hand, reserved, low_stock)
    `,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown) as AdminProductRow | null;
}

export interface ProductUpsertInput {
  id?: string;
  sku: string;
  name_fr: string;
  name_ar?: string | null;
  description_fr?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  base_price: number;
  unit?: string | null;
  unit_size?: number | null;
  weight_grams?: number | null;
  is_active?: boolean;
  is_featured?: boolean;
}

export async function adminUpsertProduct(
  sb: SupabaseClient,
  input: ProductUpsertInput,
): Promise<string> {
  if (input.id) {
    const { error } = await sb.from("products").update(input).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await sb.from("products").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Set / unset the store-specific price + promo + availability. */
export async function adminSetStorePrice(
  sb: SupabaseClient,
  storeId: string,
  productId: string,
  price: number,
  promoPrice: number | null,
  isAvailable: boolean,
): Promise<void> {
  const { error } = await sb.from("store_products").upsert({
    store_id: storeId,
    product_id: productId,
    price,
    promo_price: promoPrice,
    is_available: isAvailable,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function adminToggleProductActive(
  sb: SupabaseClient,
  productId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await sb.from("products").update({ is_active: isActive }).eq("id", productId);
  if (error) throw error;
}
