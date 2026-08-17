import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  await requireAdmin();
  const sb = createAdminClient();
  const [{ data: payments }, { data: refunds }] = await Promise.all([
    sb
      .from("payments")
      .select("id, method, status, amount, currency, created_at, order:orders(order_number)")
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("refunds")
      .select("id, amount, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const totals = (payments ?? []).reduce(
    (acc, p) => {
      const amt = Number(p.amount);
      acc.gross += amt;
      if (p.status === "captured") acc.captured += amt;
      if (p.status === "pending") acc.pending += amt;
      return acc;
    },
    { gross: 0, captured: 0, pending: 0 },
  );

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader title="Finance" description="Paiements + remboursements (50 derniers)." />

      <div className="grid grid-cols-3 gap-3">
        <DataCard>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Brut</div>
          <div className="text-2xl font-bold">{formatDZD(totals.gross)}</div>
        </DataCard>
        <DataCard>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Encaissé</div>
          <div className="text-2xl font-bold text-[var(--color-az-success)]">{formatDZD(totals.captured)}</div>
        </DataCard>
        <DataCard>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">En attente</div>
          <div className="text-2xl font-bold text-[var(--color-az-warning)]">{formatDZD(totals.pending)}</div>
        </DataCard>
      </div>

      <DataCard padded={false}>
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold">Paiements récents</h2>
        </div>
        {(!payments || payments.length === 0) ? (
          <EmptyState title="Aucun paiement" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Méthode</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {payments.map((p) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const o: any = Array.isArray(p.order) ? p.order[0] : p.order;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-semibold">{o?.order_number ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{p.method}</td>
                    <td className="px-4 py-2 text-xs">{p.status}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatDZD(Number(p.amount))}</td>
                    <td className="px-4 py-2 text-xs text-[var(--color-foreground-muted)]">
                      {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DataCard>

      {refunds && refunds.length > 0 && (
        <DataCard padded={false}>
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold">Remboursements</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {refunds.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between text-sm">
                <span>{r.reason ?? "Remboursement"}</span>
                <span className="font-semibold text-[var(--color-az-danger)]">-{formatDZD(Number(r.amount))}</span>
              </li>
            ))}
          </ul>
        </DataCard>
      )}
    </div>
  );
}
