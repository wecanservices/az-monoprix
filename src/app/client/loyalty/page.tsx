import { TrendingUp, Gift, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerLoyalty, getLoyaltyConfig } from "@/services/marketing/loyalty";
import { LoyaltyCard } from "@/components/client/loyalty-card";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const session = await requireCustomer();
  const sb = await createClient();
  const [data, cfg] = await Promise.all([
    getCustomerLoyalty(sb, session.id),
    getLoyaltyConfig(createAdminClient()),
  ]);

  // Date d'inscription = premier signup (created_at du profil)
  const { data: profile } = await sb
    .from("profiles")
    .select("created_at")
    .eq("id", session.id)
    .maybeSingle();

  const canRedeem = data.balance >= cfg.min_redeem_points;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/client/profile"
          aria-label="Retour"
          className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] grid place-items-center shadow-[var(--shadow-elev-1)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)] flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />
            Programme fidélité
          </div>
          <h1 className="text-xl font-black tracking-tight">Ma carte</h1>
        </div>
      </div>

      {/* Carte fidélité électronique */}
      <div className="pt-2">
        <LoyaltyCard
          customerId={session.id}
          customerName={session.full_name}
          balance={data.balance}
          lifetimeEarned={data.lifetime_earned}
          dzdPerPoint={cfg.dzd_per_point}
          memberSince={profile?.created_at ?? null}
        />
      </div>

      {/* Règles + stats */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-4 shadow-[var(--shadow-elev-1)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-foreground-muted)] flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Cumul total
          </div>
          <div className="text-2xl font-black tabular-nums mt-1">
            {data.lifetime_earned.toLocaleString("fr-DZ")}
          </div>
          <div className="text-[10px] text-[var(--color-foreground-muted)] mt-0.5">
            points gagnés depuis l&apos;inscription
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-4 shadow-[var(--shadow-elev-1)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-foreground-muted)] flex items-center gap-1">
            <Gift className="w-3 h-3" /> Utilisation
          </div>
          <div className="text-sm font-semibold mt-1 leading-tight">
            {canRedeem
              ? "Disponible au checkout"
              : `Encore ${(cfg.min_redeem_points - data.balance).toLocaleString("fr-DZ")} pts`}
          </div>
          <div className="text-[10px] text-[var(--color-foreground-muted)] mt-1">
            À partir de {cfg.min_redeem_points} points
          </div>
        </div>
      </section>

      {/* Règles */}
      <section className="rounded-2xl bg-[var(--color-primary-tint)]/60 border border-[var(--color-primary)]/15 p-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] mb-2">
          Comment ça marche ?
        </div>
        <ul className="text-sm space-y-1.5 text-[var(--color-foreground)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)] font-bold">·</span>
            <span>
              <strong className="font-bold">{cfg.points_per_dzd} point</strong> offert par
              DZD dépensé
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)] font-bold">·</span>
            <span>
              <strong className="font-bold">{cfg.dzd_per_point} DZD</strong> de réduction
              par point utilisé
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)] font-bold">·</span>
            <span>
              Utilisable dès{" "}
              <strong className="font-bold">
                {cfg.min_redeem_points.toLocaleString("fr-DZ")} points
              </strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-primary)] font-bold">·</span>
            <span>Présentez votre QR code en caisse pour cumuler ou utiliser</span>
          </li>
        </ul>
      </section>

      {/* Historique */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-foreground-muted)] mb-2 px-1">
          Historique
        </h2>
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)] shadow-[var(--shadow-elev-1)]">
          {data.transactions.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-foreground-muted)] text-center">
              Aucune transaction. Votre première commande cumulera automatiquement des points.
            </p>
          ) : (
            data.transactions.map((t) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const o: any = Array.isArray(t.order) ? t.order[0] : t.order;
              const isEarn = t.points > 0;
              return (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{t.reason}</div>
                    {o?.order_number && (
                      <div className="text-xs text-[var(--color-foreground-muted)] font-mono">
                        {o.order_number}
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--color-foreground-muted)] mt-0.5">
                      {new Date(t.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div
                    className={
                      "text-base font-black tabular-nums " +
                      (isEarn
                        ? "text-[var(--color-az-success)]"
                        : "text-[var(--color-az-danger)]")
                    }
                  >
                    {isEarn ? "+" : ""}
                    {t.points}
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
