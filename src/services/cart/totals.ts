import type { CartItem, CartTotals } from "@/services/types";

/**
 * Pure computation of cart totals. Runs both server-side (to write
 * `orders.total`) and client-side (to preview before checkout).
 * Server remains the source of truth — clients recompute for UX only.
 */

export function computeTotals(
  items: CartItem[],
  opts: { deliveryFee?: number; taxRate?: number; discount?: number } = {},
): CartTotals {
  const subtotal = items.reduce(
    (sum, i) =>
      sum +
      Number(i.product?.promo_price ?? i.unit_price) * i.quantity,
    0,
  );
  const discount = opts.discount ?? 0;
  const deliveryFee = opts.deliveryFee ?? 0;
  // Tax is generally included in Algerian retail prices; keep the hook
  // for future TVA-exclusive pricing.
  const tax = opts.taxRate ? Math.round(subtotal * opts.taxRate) : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee + tax);
  const item_count = items.reduce((n, i) => n + i.quantity, 0);
  return { subtotal, discount, delivery_fee: deliveryFee, tax, total, item_count };
}
