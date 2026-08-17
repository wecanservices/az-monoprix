import Link from "next/link";
import { AlertTriangle, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getKpiSummary,
  getStockAlerts,
  getTopCategories,
  getTopProducts,
  getSegmentCounts,
} from "@/services/analytics";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { MiniChart } from "@/components/admin/mini-chart";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const sb = createAdminClient();
  const [kpis, topProducts, topCategories, stockAlerts, segments] = await Promise.all([
    getKpiSummary(sb),
    getTopProducts(sb, 8),
    getTopCategories(sb, 6),
    getStockAlerts(sb),
    getSegmentCounts(sb),
  ]);

  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader
        title="Tableau de bord"
        description="Vue opérationnelle temps réel · AZ Monoprix"
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="CA 7 derniers jours" value={formatDZD(kpis.last_7d.revenue)} icon={<TrendingUp className="w-4 h-4" />} />
        <KpiTile label="Commandes 7j" value={kpis.last_7d.orders.toLocaleString("fr-DZ")} icon={<ShoppingBag className="w-4 h-4" />} />
        <KpiTile label="Panier moyen 7j" value={formatDZD(kpis.last_7d.basket_avg)} icon={<TrendingUp className="w-4 h-4" />} />
        <KpiTile label="Alertes stock" value={String(stockAlerts.length)} icon={<AlertTriangle className="w-4 h-4" />} accent={stockAlerts.length > 0 ? "warning" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DataCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">Chiffre d'affaires (30 jours)</h2>
              <p className="text-xs text-[var(--color-foreground-muted)]">Livraisons confirmées seulement.</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatDZD(kpis.last_30d.revenue)}</div>
              <div className="text-[11px] text-[var(--color-foreground-muted)]">{kpis.last_30d.orders} commandes</div>
            </div>
          </div>
          <MiniChart
            data={kpis.daily.map((d) => ({ day: d.day, value: d.revenue }))}
            height={140}
            formatY={(n) => formatDZD(n)}
          />
        </DataCard>

        <DataCard>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" />
            <h2 className="text-sm font-semibold">Segments clients</h2>
          </div>
          <ul className="space-y-2">
            {[
              ["vip", "VIP", "text-[var(--color-az-promo)]"],
              ["fidele", "Fidèles", "text-[var(--color-primary)]"],
              ["actif", "Actifs", "text-[var(--color-az-info)]"],
              ["nouveau", "Nouveaux", "text-[var(--color-az-success)]"],
              ["inactif", "Inactifs", "text-[var(--color-foreground-muted)]"],
            ].map(([key, label, cls]) => (
              <li key={key} className="flex items-center justify-between text-sm">
                <span className={cls}>{label}</span>
                <span className="font-semibold tabular-nums">{segments[key as string] ?? 0}</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/customers" className="text-xs text-[var(--color-primary)] font-medium mt-3 inline-block">
            Voir tous les clients →
          </Link>
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataCard padded={false}>
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Top produits (30j)</h2>
            <Link href="/admin/products" className="text-xs text-[var(--color-primary)]">Voir →</Link>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {topProducts.slice(0, 8).map((p, i) => (
              <li key={p.product_id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="w-6 text-right text-xs text-[var(--color-foreground-muted)] tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-[var(--color-foreground-muted)] tabular-nums">×{p.units_sold}</span>
                <span className="font-semibold tabular-nums w-24 text-right">{formatDZD(Number(p.revenue))}</span>
              </li>
            ))}
            {topProducts.length === 0 && (
              <li className="p-4 text-sm text-[var(--color-foreground-muted)]">Pas encore de ventes.</li>
            )}
          </ul>
        </DataCard>

        <DataCard padded={false}>
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold">Top catégories (30j)</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {topCategories.map((c) => (
              <li key={c.category_id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-lg">{c.icon}</span>
                <span className="flex-1 truncate">{c.category_name}</span>
                <span className="text-xs text-[var(--color-foreground-muted)] tabular-nums">×{c.units_sold}</span>
                <span className="font-semibold tabular-nums w-24 text-right">{formatDZD(Number(c.revenue))}</span>
              </li>
            ))}
            {topCategories.length === 0 && (
              <li className="p-4 text-sm text-[var(--color-foreground-muted)]">—</li>
            )}
          </ul>
        </DataCard>
      </div>

      {stockAlerts.length > 0 && (
        <DataCard>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[var(--color-az-warning)]" />
            <h2 className="text-sm font-semibold">Alertes stock ({stockAlerts.length})</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)] max-h-72 overflow-y-auto">
            {stockAlerts.slice(0, 20).map((a) => (
              <li key={`${a.store_id}-${a.product_id}`} className="py-2 flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{a.product_name}</span>
                <span className="text-xs text-[var(--color-foreground-muted)] w-40 truncate">{a.store_name}</span>
                <span className={"font-semibold tabular-nums w-16 text-right " + (a.available <= 0 ? "text-[var(--color-az-danger)]" : "text-[var(--color-az-warning)]")}>
                  {a.available <= 0 ? "0" : a.available}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/admin/inventory?low=1" className="text-xs text-[var(--color-primary)] font-medium mt-2 inline-block">
            Voir l'inventaire →
          </Link>
        </DataCard>
      )}
    </div>
  );
}

function KpiTile({
  label, value, icon, accent,
}: { label: string; value: string; icon: React.ReactNode; accent?: "warning" }) {
  return (
    <div
      className={
        "rounded-2xl border p-4 " +
        (accent === "warning"
          ? "border-[var(--color-az-warning)]/30 bg-[var(--color-az-warning-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]")
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)] flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
