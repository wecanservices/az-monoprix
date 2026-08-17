import Link from "next/link";
import { Package, MapPin } from "lucide-react";
import { requireDriver } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listAvailableMissions, listDriverMissions } from "@/services/delivery";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function DriverOrdersPage() {
  const session = await requireDriver();
  const sb = await createClient();
  const [mine, pool] = await Promise.all([
    listDriverMissions(sb, session.id),
    listAvailableMissions(sb),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-semibold mb-3">Mes missions ({mine.length})</h1>
        {mine.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Aucune mission active"
            description="Acceptez une mission ci-dessous pour la démarrer."
          />
        ) : (
          <ul className="space-y-2">
            {mine.map((m) => (
              <li key={m.order_id}>
                <Link
                  href={`/driver/order/${m.order_id}`}
                  className="block p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{m.order_number}</span>
                    <span className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)] space-y-0.5">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {m.store_name} → {m.customer_name}
                    </div>
                    <div>Créneau : {m.scheduled_start ? new Date(m.scheduled_start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                    <div>Livraison : <strong className="text-[var(--color-foreground)]">{formatDZD(m.delivery_fee)}</strong></div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Missions disponibles ({pool.length})</h2>
        {pool.length === 0 ? (
          <EmptyState title="Aucune mission dans le pool" description="Les commandes prêtes apparaîtront ici." />
        ) : (
          <ul className="space-y-2">
            {pool.map((m) => (
              <li key={m.order_id}>
                <Link
                  href={`/driver/order/${m.order_id}`}
                  className="block p-4 rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-primary)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{m.order_number}</span>
                    <span className="text-xs font-semibold text-[var(--color-az-success)]">+ {formatDZD(m.delivery_fee)}</span>
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)] space-y-0.5">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.store_name}</div>
                    <div>Client : {m.customer_name}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
