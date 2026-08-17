import { Gift, TrendingUp } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerLoyalty, getLoyaltyConfig } from "@/services/marketing/loyalty";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const session = await requireCustomer();
  const [data, cfg] = await Promise.all([
    getCustomerLoyalty(await createClient(), session.id),
    getLoyaltyConfig(createAdminClient()),
  ]);

  const worth = Math.round(data.balance * cfg.dzd_per_point);
  const canRedeem = data.balance >= cfg.min_redeem_points;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-az-red-700)] text-white p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Gift className="w-4 h-4" /> Programme fidélité
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-4xl font-black">{data.balance.toLocaleString("fr-DZ")}</div>
          <div className="text-sm opacity-90">points</div>
        </div>
        <div className="mt-1 text-sm opacity-90">
          Soit environ <strong>{formatDZD(worth)}</strong> de réduction
        </div>
        <div className="mt-3 text-xs opacity-80 space-y-0.5">
          <div>• {cfg.points_per_dzd} pt(s) offert(s) par DZD dépensé</div>
          <div>• {cfg.dzd_per_point} DZD par point utilisé</div>
          <div>• Utilisation à partir de {cfg.min_redeem_points} points</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)] flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Cumulés depuis l'inscription
          </div>
          <div className="text-2xl font-bold">{data.lifetime_earned}</div>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">
            Utilisation
          </div>
          <div className="text-sm font-medium mt-1">
            {canRedeem ? "Disponible au checkout" : `Encore ${cfg.min_redeem_points - data.balance} points`}
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-2">Historique</h2>
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {data.transactions.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
              Aucune transaction. Passez votre première commande pour cumuler.
            </p>
          ) : (
            data.transactions.map((t) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const o: any = Array.isArray(t.order) ? t.order[0] : t.order;
              return (
                <div key={t.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm">{t.reason}</div>
                    {o?.order_number && (
                      <div className="text-xs text-[var(--color-foreground-muted)]">{o.order_number}</div>
                    )}
                    <div className="text-[10px] text-[var(--color-foreground-muted)] mt-0.5">
                      {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div className={"text-sm font-bold " + (t.points > 0 ? "text-[var(--color-az-success)]" : "text-[var(--color-az-danger)]")}>
                    {t.points > 0 ? "+" : ""}{t.points}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
