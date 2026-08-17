import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminGetCustomer } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const c = await adminGetCustomer(createAdminClient(), id);
  if (!c) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = Array.isArray(c.profile) ? c.profile[0] : c.profile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const l: any = Array.isArray(c.loyalty) ? c.loyalty[0] : c.loyalty;
  const orders = c.orders ?? [];
  const lifetime = orders.reduce((n, o) => n + Number(o.total ?? 0), 0);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title={p?.full_name ?? "Client"}
        description={p?.email ?? ""}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DataCard>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Commandes</div>
          <div className="text-2xl font-semibold">{orders.length}</div>
        </DataCard>
        <DataCard>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Total dépensé</div>
          <div className="text-2xl font-semibold">{formatDZD(lifetime)}</div>
        </DataCard>
        <DataCard>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Points fidélité</div>
          <div className="text-2xl font-semibold">{l?.balance ?? 0}</div>
        </DataCard>
        <DataCard>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Membre depuis</div>
          <div className="text-sm mt-1">{new Date(c.created_at).toLocaleDateString("fr-FR")}</div>
        </DataCard>
      </div>

      <DataCard padded={false}>
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold">Historique commandes</h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-foreground-muted)]">Aucune commande.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-semibold">{o.order_number}</td>
                  <td className="px-4 py-2 text-xs">{o.status}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatDZD(Number(o.total))}</td>
                  <td className="px-4 py-2 text-xs text-[var(--color-foreground-muted)]">
                    {new Date(o.placed_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/admin/orders/${o.id}`} className="text-xs text-[var(--color-primary)]">
                      Ouvrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataCard>
    </div>
  );
}
