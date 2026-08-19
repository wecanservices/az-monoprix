import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, StoreProduct } from "@/services/types";

/**
 * All catalog reads go through this service so the shape returned to
 * the UI stays stable (and can later evolve to a materialized view).
 */

const PRODUCT_SELECT = `
  id, sku, category_id, brand_id, name_fr, name_ar, name_en,
  description_fr, unit, unit_size, weight_grams, base_price,
  is_featured, is_active,
  category:categories(id, slug, name_fr, icon),
  brand:brands(id, slug, name),
  images:product_images(url, position),
  store_products!inner(store_id, price, promo_price, is_available),
  inventory!inner(store_id, on_hand, reserved)
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any, storeId: string): StoreProduct {
  // The nested arrays are filtered to the requested store via .eq() below.
  const sp = Array.isArray(row.store_products) ? row.store_products[0] : row.store_products;
  const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
  const images = ((row.images ?? []) as { url: string; position: number }[])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((i) => i.url);

  return {
    id: row.id,
    sku: row.sku,
    category_id: row.category_id,
    brand_id: row.brand_id,
    name_fr: row.name_fr,
    name_ar: row.name_ar,
    name_en: row.name_en,
    description_fr: row.description_fr,
    unit: row.unit,
    unit_size: row.unit_size,
    weight_grams: row.weight_grams,
    base_price: Number(row.base_price),
    is_featured: !!row.is_featured,
    is_active: !!row.is_active,
    images,
    store_id: storeId,
    price: Number(sp?.price ?? row.base_price),
    promo_price: sp?.promo_price != null ? Number(sp.promo_price) : null,
    is_available: !!(sp?.is_available ?? true),
    on_hand: Number(inv?.on_hand ?? 0),
    reserved: Number(inv?.reserved ?? 0),
    category: row.category ?? null,
    brand: row.brand ?? null,
  };
}

export interface ListProductsOpts {
  storeId: string;
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  featuredOnly?: boolean;
  promotedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function listProducts(
  sb: SupabaseClient,
  opts: ListProductsOpts,
): Promise<StoreProduct[]> {
  let q = sb
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("store_products.store_id", opts.storeId)
    .eq("inventory.store_id", opts.storeId)
    .eq("store_products.is_available", true);

  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.categorySlug) {
    // sub-select via view isn't available; use join by resolving id first
    const { data: cat } = await sb
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    q = q.eq("category_id", cat.id);
  }
  if (opts.featuredOnly) q = q.eq("is_featured", true);
  if (opts.promotedOnly) q = q.not("store_products.promo_price", "is", null);
  if (opts.search && opts.search.trim().length > 1) {
    // simple ILIKE across name — cheap, gets us going. tsvector search
    // can be layered later on top of `products.search_tsv`.
    q = q.ilike("name_fr", `%${opts.search.trim()}%`);
  }

  const from = opts.offset ?? 0;
  const to = from + (opts.limit ?? 40) - 1;
  q = q.range(from, to).order("is_featured", { ascending: false }).order("name_fr");

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r, opts.storeId));
}

export async function getProductById(
  sb: SupabaseClient,
  id: string,
  storeId: string,
): Promise<StoreProduct | null> {
  const { data, error } = await sb
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("store_products.store_id", storeId)
    .eq("inventory.store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data, storeId);
}

export async function listCategories(sb: SupabaseClient): Promise<Category[]> {
  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name_fr, name_ar, name_en, icon, image_url, position, parent_id")
    .eq("is_active", true)
    .order("position");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(
  sb: SupabaseClient,
  slug: string,
): Promise<Category | null> {
  const { data } = await sb
    .from("categories")
    .select("id, slug, name_fr, name_ar, name_en, icon, image_url, position, parent_id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Category | null) ?? null;
}
