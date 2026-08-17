import Link from "next/link";
import { ShoppingCart, ArrowRight, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { CartItemRow } from "@/components/client/cart-item-row";
import { CouponInput } from "@/components/client/coupon-input";
import { getOrCreateCart } from "@/services/cart";
import { computeTotals } from "@/services/cart/totals";
import { evaluateCoupon } from "@/services/marketing/coupons";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { readSessionId } from "@/lib/cart/session-cookie";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

const FREE_SHIPPING_THRESHOLD = 3000;

export default async function CartPage() {
  const t = await getTranslations("client.cart");
  const session = await getSession();
  const sb = session ? await createClient() : createAdminClient();
  const sessionId = session ? null : await readSessionId();

  let cart: Awaited<ReturnType<typeof getOrCreateCart>> | null = null;
  try {
    if (session || sessionId) {
      cart = await getOrCreateCart(sb, {
        customerId: session?.id ?? null,
        sessionId,
      });
    }
  } catch {}

  const items = cart?.items ?? [];
  const subtotal = computeTotals(items).subtotal;

  // Re-evaluate the coupon server-side so the UI reflects the truth.
  let discount = 0;
  let deliveryFee = items.length > 0 ? 250 : 0;
  if (cart?.coupon_code && items.length > 0) {
    const ev = await evaluateCoupon(sb, cart.coupon_code, subtotal, session?.id ?? null);
    if (ev.valid) {
      discount = ev.amountOff;
      if (ev.freeShipping) deliveryFee = 0;
    }
  }
  const totals = computeTotals(items, { deliveryFee, discount });
  const remainingForFreeShip = Math.max(0, FREE_SHIPPING_THRESHOLD - totals.subtotal);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-40 pt-4">
      <h1 className="text-xl font-semibold mb-4">{t("title")}</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title={t("empty")}
          description="Parcourez le catalogue et ajoutez vos premiers produits."
          action={
            <Link
              href="/client/home"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-4 py-2 text-sm font-medium"
            >
              Commencer mes courses <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      ) : (
        <>
          {remainingForFreeShip > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-[var(--color-az-info-soft)] border border-[var(--color-az-info)]/20 p-3 mb-3">
              <Info className="w-4 h-4 mt-0.5 text-[var(--color-az-info)] shrink-0" />
              <div className="text-xs">
                Ajoutez encore{" "}
                <span className="font-semibold">{formatDZD(remainingForFreeShip)}</span>{" "}
                pour bénéficier de la livraison offerte.
              </div>
            </div>
          )}

          <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] px-4">
            {items.map((it) => (
              <CartItemRow key={it.id} item={it} />
            ))}
          </section>

          <div className="mt-4">
            <CouponInput initialCode={cart?.coupon_code ?? null} />
          </div>

          <section className="mt-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-2 text-sm">
            <Row label={t("subtotal")} value={formatDZD(totals.subtotal)} />
            {totals.discount > 0 && (
              <Row label="Réduction" value={`- ${formatDZD(totals.discount)}`} accent="promo" />
            )}
            <Row label={t("delivery")} value={formatDZD(totals.delivery_fee)} />
            <div className="border-t border-[var(--color-border)] my-2" />
            <Row label={t("total")} value={formatDZD(totals.total)} big />
          </section>

          <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
            <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">
                  {t("total")}
                </div>
                <div className="text-lg font-semibold">{formatDZD(totals.total)}</div>
              </div>
              <Link
                href="/client/checkout"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-5 py-2.5 text-sm font-semibold"
              >
                {t("checkout")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: "promo";
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          big ? "text-base font-semibold" : "text-sm text-[var(--color-foreground-muted)]"
        }
      >
        {label}
      </span>
      <span
        className={
          (big ? "text-lg font-bold " : "text-sm font-semibold ") +
          (accent === "promo" ? "text-[var(--color-az-promo)]" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
