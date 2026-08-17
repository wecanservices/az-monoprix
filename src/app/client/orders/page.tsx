import Link from "next/link";
import { Package } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default async function OrdersPage() {
  const session = await requireCustomer();
  const sb = await createClient();
  const { data: orders } = await sb
    .from("orders")
    .select("id, order_number, status, total, placed_at")
    .eq("customer_id", session.id)
    .order("placed_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <h1 className="text-xl font-semibold mb-4">Mes commandes</h1>

      {(!orders || orders.length === 0) ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="Aucune commande"
          description="Vos commandes apparaîtront ici une fois passées."
        />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/client/orders/${o.id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              >
                <div>
                  <div className="text-sm font-semibold">{o.order_number}</div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {new Date(o.placed_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {" · "}
                    {STATUS_LABEL[o.status] ?? o.status}
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatDZD(Number(o.total))}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
