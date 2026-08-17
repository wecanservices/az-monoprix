import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListCustomers } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  await requireAdmin();
  const { search } = await searchParams;
  const customers = await adminListCustomers(createAdminClient(), { search });

  return (
    <div className="max-w-6xl">
      <PageHeader title="Clients" description={`${customers.length} clients`} />

      <form className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-foreground-muted)]" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Nom, email, téléphone…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
          />
        </div>
        <button type="submit" className="h-10 px-4 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">
          Rechercher
        </button>
      </form>

      {customers.length === 0 ? (
        <EmptyState title="Aucun client" description="Ajustez la recherche." />
      ) : (
        <DataCard padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Fidélité</th>
                <th className="px-4 py-3">Inscription</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {customers.map((c) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p: any = Array.isArray(c.profile) ? c.profile[0] : c.profile;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const l: any = Array.isArray(c.loyalty) ? c.loyalty[0] : c.loyalty;
                return (
                  <tr key={c.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p?.full_name ?? "—"}</div>
                      <div className="text-xs text-[var(--color-foreground-muted)] font-mono">{c.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p?.email}<br />
                      <span className="text-[var(--color-foreground-muted)]">{p?.phone ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {l ? (
                        <>
                          <span className="font-semibold">{l.balance ?? 0} pts</span>
                          <span className="text-[var(--color-foreground-muted)]"> · {l.lifetime_earned ?? 0} cumulés</span>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                      {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/customers/${c.id}`} className="text-xs text-[var(--color-primary)] font-medium">
                        Voir →
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
