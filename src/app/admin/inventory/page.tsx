import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListInventory, adminListStores, adminListMovements } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StockAdjuster } from "./stock-adjuster";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  receive: "Réception",
  reserve: "Réservation",
  release: "Libération",
  pick: "Prélèvement",
  return: "Retour",
  adjust: "Ajustement",
  transfer_in: "Transfert +",
  transfer_out: "Transfert -",
  loss: "Perte",
};

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string; search?: string; low?: string }>;
}) {
  await requireAdmin();
  const { storeId, search, low } = await searchParams;
  const sb = createAdminClient();
  const [stores, rows, movements] = await Promise.all([
    adminListStores(sb),
    adminListInventory(sb, {
      storeId: storeId ?? stores0(await adminListStores(sb)),
      search,
      lowOnly: low === "1",
    }),
    adminListMovements(sb, { storeId, limit: 20 }),
  ]);

  const currentStoreId = storeId ?? rows[0]?.store_id ?? stores[0]?.id;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Inventaire" description={`${rows.length} lignes`} />

      <form className="flex flex-wrap items-center gap-2 mb-4">
        <select
          name="storeId"
          defaultValue={currentStoreId ?? ""}
          className={selectCls}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          name="search"
          defaultValue={search}
          placeholder="Rechercher (SKU, nom)…"
          className="flex-1 min-w-[200px] h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
        />
        <label className="text-xs flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <input type="checkbox" name="low" value="1" defaultChecked={low === "1"} />
          Stock faible seulement
        </label>
        <button type="submit" className="h-10 px-4 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">
          Filtrer
        </button>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        {rows.length === 0 ? (
          <EmptyState title="Aucun stock" description="Essayez de changer de magasin ou de filtre." />
        ) : (
          <DataCard padded={false}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Réservé</th>
                  <th className="px-4 py-3 text-right">Dispo</th>
                  <th className="px-4 py-3">Ajustement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {rows.map((r) => {
                  const available = r.on_hand - r.reserved;
                  const isLow = r.on_hand <= r.low_stock;
                  return (
                    <tr key={r.product_id + r.store_id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{r.product?.name_fr}</div>
                        <div className="text-xs text-[var(--color-foreground-muted)]">{r.product?.sku}</div>
                      </td>
                      <td className={"px-4 py-3 text-right font-semibold tabular-nums " + (isLow ? "text-[var(--color-az-danger)]" : "")}>
                        {r.on_hand}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{r.reserved}</td>
                      <td className={"px-4 py-3 text-right font-semibold tabular-nums " + (available <= 0 ? "text-[var(--color-az-danger)]" : "")}>
                        {available}
                      </td>
                      <td className="px-4 py-3">
                        <StockAdjuster storeId={r.store_id} productId={r.product_id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataCard>
        )}

        <DataCard>
          <h2 className="text-sm font-semibold mb-2">Derniers mouvements</h2>
          {movements.length === 0 ? (
            <p className="text-xs text-[var(--color-foreground-muted)]">Aucun mouvement récent.</p>
          ) : (
            <ul className="space-y-2 max-h-[520px] overflow-y-auto">
              {movements.map((m) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p: any = Array.isArray(m.product) ? m.product[0] : m.product;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const a: any = Array.isArray(m.actor) ? m.actor[0] : m.actor;
                return (
                  <li key={m.id} className="text-xs border-b border-[var(--color-border)] pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{TYPE_LABEL[m.type] ?? m.type}</span>
                      <span className={m.type === "loss" || m.type === "pick" || m.type === "transfer_out" ? "text-[var(--color-az-danger)]" : "text-[var(--color-az-success)]"}>
                        {m.type === "reserve" || m.type === "release" ? "" : m.type === "receive" || m.type === "return" || m.type === "adjust" || m.type === "transfer_in" ? "+" : "-"}
                        {m.quantity}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--color-foreground-muted)] truncate">
                      {p?.name_fr}
                    </div>
                    <div className="text-[10px] text-[var(--color-foreground-muted)] mt-0.5">
                      {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {a?.full_name && ` · ${a.full_name}`}
                      {m.reason && ` · ${m.reason}`}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-2">
            <Link href="/admin/products" className="text-xs text-[var(--color-primary)]">Voir les produits →</Link>
          </div>
        </DataCard>
      </div>
    </div>
  );
}

function stores0(list: { id: string }[]): string | undefined {
  return list[0]?.id;
}

const selectCls =
  "h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
