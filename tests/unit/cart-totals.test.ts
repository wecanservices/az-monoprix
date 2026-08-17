/**
 * Cart totals — pure function, easy to smoke-test without a DB.
 * Run with: `pnpm tsx tests/unit/cart-totals.test.ts`
 */
import { computeTotals } from "../../src/services/cart/totals";

function assertEq<T>(name: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const marker = ok ? "✅" : "❌";
  // eslint-disable-next-line no-console
  console.log(`${marker} ${name}${ok ? "" : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
  if (!ok) process.exitCode = 1;
}

const item = (unit_price: number, quantity: number, promo?: number) => ({
  id: "x", cart_id: "c", product_id: "p", unit_price, quantity,
  product: { sku: "S", name_fr: "N", unit: "u", unit_size: 1, images: [], promo_price: promo ?? null },
});

assertEq("empty cart", computeTotals([]).total, 0);

assertEq(
  "simple subtotal",
  computeTotals([item(100, 2)]).subtotal,
  200,
);

assertEq(
  "promo price beats unit price",
  computeTotals([item(100, 2, 80)]).subtotal,
  160,
);

assertEq(
  "delivery + discount applied",
  computeTotals([item(100, 2)], { deliveryFee: 250, discount: 50 }).total,
  200 - 50 + 250,
);

assertEq(
  "total floored at 0 if discount > sum",
  computeTotals([item(50, 1)], { discount: 999 }).total,
  0,
);

assertEq(
  "item_count sums quantities",
  computeTotals([item(10, 3), item(20, 2)]).item_count,
  5,
);
