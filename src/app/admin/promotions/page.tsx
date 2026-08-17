import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListPromotions } from "@/services/marketing/promotions";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  percentage: "Pourcentage",
  fixed_amount: "Montant fixe",
  buy_x_get_y: "Achetez X, offert Y",
  bundle: "Pack",
  free_shipping: "Livraison offerte",
};

export default async function AdminPromotionsPage() {
  await requireAdmin();
  const promos = await adminListPromotions(createAdminClient());
  const active = promos.filter((p) => p.is_active);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Promotions"
        description={`${active.length}/${promos.length} actives`}
        actions={
          <Link
            href="/admin/promotions/new"
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white text-sm font-semibold px-3 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Nouvelle promotion
          </Link>
        }
      />

      {promos.length === 0 ? (
        <EmptyState icon={<Tag className="w-6 h-6" />} title="Aucune promotion" />
      ) : (
        <DataCard padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Valeur</th>
                <th className="px-4 py-3 text-right">Min. commande</th>
                <th className="px-4 py-3 text-right">Produits</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {promos.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-surface-muted)]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/promotions/${p.id}`} className="font-medium hover:text-[var(--color-primary)]">
                      {p.name}
                    </Link>
                    {p.code && (
                      <div className="text-[10px] font-mono text-[var(--color-foreground-muted)]">
                        {p.code}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{TYPE_LABEL[p.type]}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {p.type === "percentage" ? `${p.value}%` : p.type === "free_shipping" ? "—" : formatDZD(p.value ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">
                    {p.min_order ? formatDZD(p.min_order) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">{p.product_count}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {new Date(p.starts_at).toLocaleDateString("fr-FR")}
                    {p.ends_at && ` → ${new Date(p.ends_at).toLocaleDateString("fr-FR")}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold " +
                      (p.is_active
                        ? "bg-[var(--color-az-success-soft)] text-[var(--color-az-success)]"
                        : "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]")
                    }>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/promotions/${p.id}`} className="text-xs text-[var(--color-primary)] font-medium">
                      Éditer →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataCard>
      )}
    </div>
  );
}
