import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cart, CartItem } from "@/services/types";
import { computeTotals } from "./totals";
import { DEFAULT_STORE_ID } from "@/services/stores";

const CART_ITEM_SELECT = `
  id, cart_id, product_id, quantity, unit_price,
  product:products(
    sku, name_fr, unit, unit_size,
    images:product_images(url, position),
    store_products(promo_price, store_id)
  )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(row: any, storeId: string): CartItem {
  const p = row.product;
  const images = ((p?.images ?? []) as { url: string; position: number }[])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((i) => i.url);
  const sp = ((p?.store_products ?? []) as { promo_price: number | null; store_id: string }[])
    .find((s) => s.store_id === storeId);
  return {
    id: row.id,
    cart_id: row.cart_id,
    product_id: row.product_id,
    quantity: row.quantity,
    unit_price: Number(row.unit_price),
    product: p && {
      sku: p.sku,
      name_fr: p.name_fr,
      unit: p.unit,
      unit_size: p.unit_size,
      images,
      promo_price: sp?.promo_price != null ? Number(sp.promo_price) : null,
    },
  };
}

/** Fetch (or create) the current cart for a user or session. */
export async function getOrCreateCart(
  sb: SupabaseClient,
  opts: { customerId?: string | null; sessionId?: string | null; storeId?: string },
): Promise<Cart> {
  const storeId = opts.storeId ?? DEFAULT_STORE_ID;

  // 1. Try existing cart
  let query = sb.from("carts").select("id, customer_id, session_id, store_id, currency, coupon_code").limit(1);
  if (opts.customerId) query = query.eq("customer_id", opts.customerId);
  else if (opts.sessionId) query = query.eq("session_id", opts.sessionId);
  else throw new Error("cart: customerId or sessionId required");

  const { data: found } = await query.maybeSingle();

  let cartRow = found;
  if (!cartRow) {
    const { data: created, error } = await sb
      .from("carts")
      .insert({
        customer_id: opts.customerId ?? null,
        session_id: opts.customerId ? null : opts.sessionId,
        store_id: storeId,
      })
      .select("id, customer_id, session_id, store_id, currency, coupon_code")
      .single();
    if (error) throw error;
    cartRow = created;
  }

  // 2. Load items
  const { data: itemsRaw } = await sb
    .from("cart_items")
    .select(CART_ITEM_SELECT)
    .eq("cart_id", cartRow.id)
    .order("created_at");

  const items = (itemsRaw ?? []).map((r) => mapItem(r, cartRow.store_id ?? storeId));
  const totals = computeTotals(items);

  return {
    id: cartRow.id,
    customer_id: cartRow.customer_id,
    session_id: cartRow.session_id,
    store_id: cartRow.store_id ?? storeId,
    currency: cartRow.currency ?? "DZD",
    coupon_code: cartRow.coupon_code,
    items,
    totals,
  };
}

export async function addToCart(
  sb: SupabaseClient,
  cart: { id: string; store_id: string },
  productId: string,
  quantity = 1,
): Promise<CartItem> {
  // Read current price from store_products (source of truth).
  const { data: sp, error: spErr } = await sb
    .from("store_products")
    .select("price, promo_price, is_available")
    .eq("store_id", cart.store_id)
    .eq("product_id", productId)
    .maybeSingle();
  if (spErr) throw spErr;
  if (!sp || !sp.is_available) throw new Error("Produit indisponible");

  const unitPrice = Number(sp.promo_price ?? sp.price);

  // Upsert cart item.
  const { data: existing } = await sb
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await sb
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity, unit_price: unitPrice })
      .eq("id", existing.id)
      .select(CART_ITEM_SELECT)
      .single();
    if (error) throw error;
    return mapItem(data, cart.store_id);
  }

  const { data, error } = await sb
    .from("cart_items")
    .insert({
      cart_id: cart.id,
      product_id: productId,
      quantity,
      unit_price: unitPrice,
    })
    .select(CART_ITEM_SELECT)
    .single();
  if (error) throw error;
  return mapItem(data, cart.store_id);
}

export async function updateCartItemQuantity(
  sb: SupabaseClient,
  itemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    const { error } = await sb.from("cart_items").delete().eq("id", itemId);
    if (error) throw error;
    return;
  }
  const { error } = await sb
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);
  if (error) throw error;
}

export async function removeCartItem(
  sb: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await sb.from("cart_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function clearCart(sb: SupabaseClient, cartId: string): Promise<void> {
  const { error } = await sb.from("cart_items").delete().eq("cart_id", cartId);
  if (error) throw error;
}

/** Merge an anonymous cart (session_id) into a logged-in customer's cart. */
export async function mergeSessionCart(
  sb: SupabaseClient,
  sessionId: string,
  customerId: string,
): Promise<void> {
  const { data: sessCart } = await sb
    .from("carts")
    .select("id, store_id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!sessCart) return;

  const customerCart = await getOrCreateCart(sb, { customerId, storeId: sessCart.store_id });

  const { data: sessItems } = await sb
    .from("cart_items")
    .select("product_id, quantity")
    .eq("cart_id", sessCart.id);

  for (const it of sessItems ?? []) {
    await addToCart(sb, { id: customerCart.id, store_id: customerCart.store_id! }, it.product_id, it.quantity);
  }

  await sb.from("carts").delete().eq("id", sessCart.id);
}
