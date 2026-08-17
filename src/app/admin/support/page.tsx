import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListTickets } from "@/services/support";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)]",
  in_progress: "bg-[var(--color-az-warning-soft)] text-[var(--color-az-warning)]",
  resolved: "bg-[var(--color-az-success-soft)] text-[var(--color-az-success)]",
  closed: "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: "open" | "in_progress" | "resolved" | "closed" }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const tickets = await adminListTickets(createAdminClient(), { status });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Support" description={`${tickets.length} tickets`} />

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ["Tous", ""],
          ["Ouverts", "open"],
          ["En cours", "in_progress"],
          ["Résolus", "resolved"],
          ["Fermés", "closed"],
        ].map(([label, v]) => (
          <Link
            key={label}
            href={v ? `/admin/support?status=${v}` : "/admin/support"}
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

      {tickets.length === 0 ? (
        <EmptyState title="Aucun ticket" description="Bonne nouvelle !" />
      ) : (
        <DataCard padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Sujet</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {tickets.map((t) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c: any = Array.isArray(t.customer) ? t.customer[0] : t.customer;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p: any = Array.isArray(c?.profile) ? c.profile[0] : c?.profile;
                return (
                  <tr key={t.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="px-4 py-3 font-medium">{t.subject}</td>
                    <td className="px-4 py-3 text-xs">{p?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs capitalize">{t.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[t.status]}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                      {new Date(t.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/support/${t.id}`} className="text-xs text-[var(--color-primary)] font-medium">
                        Ouvrir →
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
