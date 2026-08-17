import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Package, Clock } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  assigned: "Livreur assigné",
  picked_up: "Récupérée",
  in_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  const session = await requireCustomer();
  const sb = await createClient();

  const { data: order } = await sb
    .from("orders")
    .select(
      "id, order_number, status, subtotal, delivery_fee, total, placed_at, scheduled_start, scheduled_end, fulfillment_mode, notes",
    )
    .eq("id", id)
    .eq("customer_id", session.id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await sb
    .from("order_items")
    .select("id, quantity, unit_price, total, product_snapshot")
    .eq("order_id", id);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-5">
      {placed && (
        <div className="rounded-2xl bg-[var(--color-az-success-soft)] border border-[var(--color-az-success)]/30 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 mt-0.5 text-[var(--color-az-success)]" />
          <div>
            <div className="font-semibold">Commande confirmée !</div>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Vous recevrez une notification à chaque étape de la préparation et de la livraison.
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--color-foreground-muted)]">
          Commande
        </div>
        <h1 className="text-2xl font-bold">{order.order_number}</h1>
      </div>

      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          <span className="text-sm font-semibold">Statut :</span>
          <span className="text-sm">{STATUS_LABEL[order.status] ?? order.status}</span>
        </div>
        {order.scheduled_start && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
            <Clock className="w-4 h-4" />
            Créneau :{" "}
            {new Date(order.scheduled_start).toLocaleString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {(items ?? []).map((it) => {
          type Snap = { name?: string; unit?: string };
          const snap = (it.product_snapshot ?? {}) as Snap;
          return (
            <div key={it.id} className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-muted)] grid place-items-center text-lg">
                🛍️
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{snap.name ?? "Produit"}</div>
                <div className="text-xs text-[var(--color-foreground-muted)]">
                  {it.quantity} × {formatDZD(Number(it.unit_price))}
                </div>
              </div>
              <div className="text-sm font-semibold">{formatDZD(Number(it.total))}</div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-2 text-sm">
        <Row label="Sous-total" value={formatDZD(Number(order.subtotal))} />
        <Row label="Livraison" value={formatDZD(Number(order.delivery_fee))} />
        <div className="border-t border-[var(--color-border)] my-1" />
        <Row label="Total" value={formatDZD(Number(order.total))} big />
      </section>

      <div className="flex items-center gap-3">
        <Link
          href={`/client/tracking/${order.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] text-white px-4 py-2 text-sm font-semibold"
        >
          Suivre la livraison →
        </Link>
        <Link
          href="/client/home"
          className="text-sm text-[var(--color-foreground-muted)] font-medium"
        >
          ← Accueil
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={big ? "text-base font-semibold" : "text-sm text-[var(--color-foreground-muted)]"}>
        {label}
      </span>
      <span className={big ? "text-lg font-bold" : "text-sm font-semibold"}>{value}</span>
    </div>
  );
}
