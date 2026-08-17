import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage() {
  await requireAdmin();
  const sb = await createClient();

  const [{ data: drivers }, { data: active }] = await Promise.all([
    sb
      .from("drivers")
      .select("id, status, rating, total_deliveries, profile:profiles(full_name, phone)")
      .in("status", ["online", "busy"])
      .order("status"),
    sb
      .from("deliveries")
      .select(
        `
        id, driver_id, picked_up_at,
        order:orders(order_number, status, total, scheduled_end),
        driver:profiles!deliveries_driver_id_fkey(full_name)
      `,
      )
      .is("delivered_at", null)
      .not("driver_id", "is", null)
      .order("assigned_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Livraisons en cours</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Vue temps réel des livreurs actifs et des courses en cours.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
          Livreurs en ligne ({drivers?.length ?? 0})
        </h2>
        {(!drivers || drivers.length === 0) ? (
          <EmptyState title="Aucun livreur en ligne" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {drivers.map((d) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p: any = Array.isArray(d.profile) ? d.profile[0] : d.profile;
              return (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white grid place-items-center font-semibold">
                    {(p?.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p?.full_name ?? "Livreur"}</div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      {p?.phone ?? "—"} · {d.rating?.toFixed(1) ?? "—"} ★ · {d.total_deliveries} livraisons
                    </div>
                  </div>
                  <span
                    className={
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold " +
                      (d.status === "online"
                        ? "bg-[var(--color-az-success-soft)] text-[var(--color-az-success)]"
                        : "bg-[var(--color-az-warning-soft)] text-[var(--color-az-warning)]")
                    }
                  >
                    {d.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
          Courses en cours ({active?.length ?? 0})
        </h2>
        {(!active || active.length === 0) ? (
          <EmptyState title="Aucune course en cours" />
        ) : (
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {active.map((d) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const o: any = Array.isArray(d.order) ? d.order[0] : d.order;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const dp: any = Array.isArray(d.driver) ? d.driver[0] : d.driver;
              return (
                <div key={d.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{o?.order_number}</div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      {dp?.full_name ?? "—"} · {o?.status}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatDZD(Number(o?.total ?? 0))}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
