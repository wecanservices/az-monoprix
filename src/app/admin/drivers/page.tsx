import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListDrivers } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import { VerifyButton } from "./verify-button";

export const dynamic = "force-dynamic";

export default async function AdminDriversPage() {
  await requireAdmin();
  const drivers = await adminListDrivers(createAdminClient());

  const pending = drivers.filter((d) => !d.is_verified);
  const verified = drivers.filter((d) => d.is_verified);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Livreurs" description={`${drivers.length} livreurs · ${pending.length} en attente de validation`} />

      {pending.length > 0 && (
        <DataCard>
          <h2 className="text-sm font-semibold mb-3">En attente de validation ({pending.length})</h2>
          <ul className="divide-y divide-[var(--color-border)]">
            {pending.map((d) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p: any = Array.isArray(d.profile) ? d.profile[0] : d.profile;
              return (
                <li key={d.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-az-warning)]/20 text-[var(--color-az-warning)] grid place-items-center font-semibold">
                    {(p?.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p?.full_name ?? "—"}</div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">{p?.email} · {p?.phone ?? "—"} · {d.vehicle_type}</div>
                  </div>
                  <VerifyButton driverId={d.id} verified={false} />
                </li>
              );
            })}
          </ul>
        </DataCard>
      )}

      {verified.length === 0 ? (
        <EmptyState title="Aucun livreur vérifié" />
      ) : (
        <DataCard padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Livreur</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Véhicule</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Livraisons</th>
                <th className="px-4 py-3 text-right">Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {verified.map((d) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p: any = Array.isArray(d.profile) ? d.profile[0] : d.profile;
                return (
                  <tr key={d.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="px-4 py-3 font-medium">{p?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{p?.email}<br />{p?.phone}</td>
                    <td className="px-4 py-3 text-xs">{d.vehicle_type} {d.vehicle_plate ? `· ${d.vehicle_plate}` : ""}</td>
                    <td className="px-4 py-3">
                      <span className={
                        "text-[10px] px-2 py-0.5 rounded-full font-semibold " +
                        (d.status === "online" ? "bg-[var(--color-az-success-soft)] text-[var(--color-az-success)]" :
                         d.status === "busy" ? "bg-[var(--color-az-warning-soft)] text-[var(--color-az-warning)]" :
                         "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]")
                      }>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.total_deliveries}</td>
                    <td className="px-4 py-3 text-right">{d.rating?.toFixed(1) ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <VerifyButton driverId={d.id} verified={true} />
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
