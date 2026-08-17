import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[var(--color-az-neutral-200)] text-[var(--color-az-neutral-800)]",
  confirmed: "bg-[var(--color-az-info-soft)] text-[var(--color-az-info)]",
  preparing: "bg-[var(--color-az-warning-soft)] text-[var(--color-az-warning)]",
  partially_available: "bg-[var(--color-az-warning-soft)] text-[var(--color-az-warning)]",
  ready: "bg-[var(--color-az-info-soft)] text-[var(--color-az-info)]",
  assigned: "bg-[var(--color-az-info-soft)] text-[var(--color-az-info)]",
  picked_up: "bg-[var(--color-az-info-soft)] text-[var(--color-az-info)]",
  delivered: "bg-[var(--color-az-success-soft)] text-[var(--color-az-success)]",
  cancelled: "bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)]",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const sb = await createClient();

  let q = sb
    .from("orders")
    .select(
      "id, order_number, status, total, placed_at, fulfillment_mode, customer:customers(profile:profiles(full_name))",
    )
    .order("placed_at", { ascending: false })
    .limit(50);
  if (status) q = q.eq("status", status);
  const { data: orders } = await q;

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Commandes</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {orders?.length ?? 0} commandes récentes
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["Toutes", ""],
          ["En attente", "pending"],
          ["Préparation", "preparing"],
          ["Prêtes", "ready"],
          ["Livraison", "picked_up"],
          ["Livrées", "delivered"],
        ].map(([label, v]) => (
          <Link
            key={label}
            href={v ? `/admin/orders?status=${v}` : "/admin/orders"}
            className={
              (status ?? "") === v
                ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-white"
                : "px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--color-border)] text-[var(--color-foreground-muted)]"
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {(!orders || orders.length === 0) ? (
        <EmptyState title="Aucune commande" />
      ) : (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {orders.map((o) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cust: any = Array.isArray(o.customer) ? o.customer[0] : o.customer;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const prof: any = Array.isArray(cust?.profile) ? cust.profile[0] : cust?.profile;
                return (
                  <tr key={o.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="px-4 py-3 font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3">{prof?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{o.fulfillment_mode}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] ?? ""}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatDZD(Number(o.total))}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                      {new Date(o.placed_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="text-xs text-[var(--color-primary)] font-medium">
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
