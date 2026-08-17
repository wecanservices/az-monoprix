import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoyaltyConfig } from "@/services/marketing/loyalty";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { LoyaltyConfigForm } from "./loyalty-config-form";

export const dynamic = "force-dynamic";

export default async function AdminLoyaltyPage() {
  await requireAdmin();
  const cfg = await getLoyaltyConfig(createAdminClient());
  const sb = createAdminClient();
  const { data: topEarners } = await sb
    .from("loyalty_accounts")
    .select("customer_id, balance, lifetime_earned, customer:customers(profile:profiles(full_name))")
    .order("lifetime_earned", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Programme fidélité" description="Règles d'attribution et gains cumulés." />

      <DataCard>
        <h2 className="text-sm font-semibold mb-1">Règles</h2>
        <p className="text-xs text-[var(--color-foreground-muted)] mb-4">
          Les points sont attribués automatiquement à chaque commande <strong>livrée</strong>.
        </p>
        <LoyaltyConfigForm initial={cfg} />
      </DataCard>

      <DataCard padded={false}>
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold">Top 20 des clients fidèles</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Solde</th>
              <th className="px-4 py-3 text-right">Cumulés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(topEarners ?? []).map((r) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cust: any = Array.isArray(r.customer) ? r.customer[0] : r.customer;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p: any = Array.isArray(cust?.profile) ? cust.profile[0] : cust?.profile;
              return (
                <tr key={r.customer_id}>
                  <td className="px-4 py-2">{p?.full_name ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{r.balance}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.lifetime_earned}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataCard>
    </div>
  );
}
