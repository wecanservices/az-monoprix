import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { requireDriver } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listDriverMissions } from "@/services/delivery";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const session = await requireDriver();
  const sb = await createClient();

  const [{ data: today }, { data: driver }] = await Promise.all([
    sb
      .from("deliveries")
      .select("id, order:orders(delivery_fee, delivered_at)")
      .eq("driver_id", session.id)
      .not("delivered_at", "is", null)
      .gte("delivered_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    sb.from("drivers").select("rating, total_deliveries").eq("id", session.id).maybeSingle(),
  ]);

  const active = await listDriverMissions(sb, session.id);
  const revenueToday = (today ?? []).reduce((n, d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o: any = Array.isArray(d.order) ? d.order[0] : d.order;
    return n + Number(o?.delivery_fee ?? 0);
  }, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bonjour {session.full_name?.split(" ")[0] ?? "livreur"} 👋</h1>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Livraisons" value={String((today ?? []).length)} />
        <Stat label="Revenus" value={formatDZD(revenueToday)} />
        <Stat label="Note" value={driver?.rating?.toFixed(1) ?? "—"} />
      </div>

      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Mission en cours</h2>
          <Link href="/driver/orders" className="text-xs text-[var(--color-primary)] inline-flex items-center gap-1">
            Voir toutes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="text-sm text-[var(--color-foreground-muted)] py-6 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Aucune mission active. Passez en ligne pour recevoir des missions.
          </div>
        ) : (
          <ul className="space-y-2">
            {active.map((m) => (
              <li key={m.order_id}>
                <Link
                  href={`/driver/order/${m.order_id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                >
                  <div>
                    <div className="text-sm font-semibold">{m.order_number}</div>
                    <div className="text-xs text-[var(--color-foreground-muted)]">{m.customer_name}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--color-foreground-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
