import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDriverPerformance,
  getKpiSummary,
  getTopCategories,
  getTopProducts,
} from "@/services/analytics";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { MiniChart } from "@/components/admin/mini-chart";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireAdmin();
  const sb = createAdminClient();
  const [kpis, topProducts, topCategories, drivers] = await Promise.all([
    getKpiSummary(sb),
    getTopProducts(sb, 20),
    getTopCategories(sb, 12),
    getDriverPerformance(sb),
  ]);

  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader title="Analytique" description="Performances détaillées." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataCard>
          <h2 className="text-sm font-semibold mb-2">CA quotidien (30j)</h2>
          <MiniChart
            data={kpis.daily.map((d) => ({ day: d.day, value: d.revenue }))}
            height={160}
            formatY={(n) => formatDZD(n)}
          />
        </DataCard>
        <DataCard>
          <h2 className="text-sm font-semibold mb-2">Commandes / jour (30j)</h2>
          <MiniChart
            data={kpis.daily.map((d) => ({ day: d.day, value: d.orders }))}
            height={160}
            color="var(--color-az-info)"
          />
        </DataCard>
      </div>

      <DataCard padded={false}>
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold">Top produits (30 jours)</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Unités</th>
              <th className="px-4 py-3 text-right">CA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {topProducts.map((p, i) => (
              <tr key={p.product_id}>
                <td className="px-4 py-2 text-xs text-[var(--color-foreground-muted)]">{i + 1}</td>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-xs font-mono text-[var(--color-foreground-muted)]">{p.sku}</td>
                <td className="px-4 py-2 text-right tabular-nums">{p.units_sold}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatDZD(Number(p.revenue))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataCard padded={false}>
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold">Top catégories</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {topCategories.map((c) => (
              <li key={c.category_id} className="px-4 py-2 flex items-center gap-3 text-sm">
                <span className="text-lg">{c.icon}</span>
                <span className="flex-1">{c.category_name}</span>
                <span className="tabular-nums text-xs text-[var(--color-foreground-muted)]">×{c.units_sold}</span>
                <span className="font-semibold tabular-nums w-24 text-right">{formatDZD(Number(c.revenue))}</span>
              </li>
            ))}
          </ul>
        </DataCard>

        <DataCard padded={false}>
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold">Performance livreurs (30j)</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {drivers.map((d) => (
              <li key={d.driver_id} className="px-4 py-2 flex items-center gap-3 text-sm">
                <span className="flex-1">{d.driver_name}</span>
                <span className="tabular-nums text-xs text-[var(--color-foreground-muted)]">
                  {d.avg_minutes ? `${d.avg_minutes} min` : "—"}
                </span>
                <span className="font-semibold tabular-nums w-16 text-right">{d.deliveries}</span>
              </li>
            ))}
            {drivers.length === 0 && (
              <li className="px-4 py-4 text-sm text-[var(--color-foreground-muted)]">Pas encore de livraisons.</li>
            )}
          </ul>
        </DataCard>
      </div>
    </div>
  );
}
