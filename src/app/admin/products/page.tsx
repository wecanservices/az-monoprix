import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListProducts, adminListCategories } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  await requireAdmin();
  const { search, category } = await searchParams;
  const sb = createAdminClient();
  const [products, categories] = await Promise.all([
    adminListProducts(sb, { search, categoryId: category, limit: 300 }),
    adminListCategories(sb),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Produits"
        description={`${products.length} produits`}
        actions={
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white text-sm font-semibold px-3 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Nouveau produit
          </Link>
        }
      />

      <form className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-foreground-muted)]" />
          <input
            name="search"
            defaultValue={search}
            placeholder="SKU, nom…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
          />
        </div>
        <select
          name="category"
          defaultValue={category ?? ""}
          className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_fr}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium"
        >
          Filtrer
        </button>
      </form>

      {products.length === 0 ? (
        <EmptyState title="Aucun produit" description="Ajustez les filtres ou créez un nouveau produit." />
      ) : (
        <DataCard padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Marque</th>
                <th className="px-4 py-3 text-right">Prix</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {products.map((p) => {
                const sp = p.store_products?.[0];
                const inv = p.inventory?.[0];
                return (
                  <tr key={p.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-[var(--color-primary)]">
                        {p.name_fr}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.category?.icon} {p.category?.name_fr ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{p.brand?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatDZD(sp?.price ?? p.base_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums">
                      {inv ? `${inv.on_hand - inv.reserved}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-az-success-soft)] text-[var(--color-az-success)] font-medium">
                          Actif
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)] font-medium">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/products/${p.id}`} className="text-xs text-[var(--color-primary)] font-medium">
                        Éditer →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataCard>
      )}
    </div>
  );
}
