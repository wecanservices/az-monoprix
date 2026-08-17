import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, Package, ExternalLink } from "lucide-react";
import { requireDriver } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { formatDZD } from "@/utils/money";
import { MissionActions } from "./actions";
import { GpsTracker } from "@/components/driver/gps-tracker";
import { isActiveMissionStatus } from "@/services/delivery";
import type { OrderStatus } from "@/constants/order-status";

export const dynamic = "force-dynamic";

export default async function DriverOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireDriver();
  const sb = await createClient();

  const { data: order } = await sb
    .from("orders")
    .select(
      `
      id, order_number, status, total, delivery_fee, scheduled_start, notes,
      address_snapshot,
      store:stores(name, address, phone),
      customer:customers(id, profile:profiles(full_name, phone)),
      delivery:deliveries(id, driver_id, otp_code, distance_km, picked_up_at),
      items:order_items(id, quantity, quantity_picked, is_available, product_snapshot)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delivery: any = Array.isArray(order.delivery) ? order.delivery[0] : order.delivery;
  const isPool = !delivery?.driver_id;
  const isMine = delivery?.driver_id === session.id;

  if (!isPool && !isMine) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: any = Array.isArray(order.store) ? order.store[0] : order.store;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cust: any = Array.isArray(order.customer) ? order.customer[0] : order.customer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof: any = Array.isArray(cust?.profile) ? cust.profile[0] : cust?.profile;
  const addr = (order.address_snapshot ?? {}) as Record<string, string>;

  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr.address_line ?? store?.address ?? "")}`;

  return (
    <div className="space-y-4">
      {isMine && isActiveMissionStatus(order.status as OrderStatus) && <GpsTracker enabled />}

      <div className="flex items-center gap-2">
        <Link
          href="/driver/orders"
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Mission</div>
          <h1 className="text-lg font-semibold">{order.order_number}</h1>
        </div>
        <span className="ml-auto text-sm font-semibold">{formatDZD(Number(order.delivery_fee))}</span>
      </div>

      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        <StopRow
          type="Magasin"
          name={store?.name ?? ""}
          address={store?.address ?? ""}
          phone={store?.phone ?? null}
        />
        <StopRow
          type="Client"
          name={prof?.full_name ?? ""}
          address={addr.address_line ?? ""}
          phone={prof?.phone ?? null}
        />
        <div className="p-4">
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium"
          >
            <ExternalLink className="w-4 h-4" /> Ouvrir dans Maps
          </a>
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4" />
          <h2 className="text-sm font-semibold">Articles ({(order.items ?? []).length})</h2>
        </div>
        <ul className="divide-y divide-[var(--color-border)]">
          {(order.items ?? []).map((it) => {
            type Snap = { name?: string };
            const snap = (it.product_snapshot ?? {}) as Snap;
            return (
              <li key={it.id} className="py-2 flex items-center justify-between text-sm">
                <span className={it.is_available === false ? "line-through opacity-60" : ""}>
                  {it.quantity} × {snap.name ?? "Produit"}
                </span>
                {it.is_available === false && (
                  <span className="text-xs text-[var(--color-az-danger)] font-medium">Indispo</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {order.notes && (
        <section className="rounded-2xl bg-[var(--color-az-warning-soft)] border border-[var(--color-az-warning)]/30 p-3 text-sm">
          <strong className="font-semibold">Note client :</strong> {order.notes}
        </section>
      )}

      <MissionActions
        orderId={order.id}
        status={order.status as OrderStatus}
        isMine={isMine}
        otp={isMine ? delivery?.otp_code ?? null : null}
      />
    </div>
  );
}

function StopRow({
  type, name, address, phone,
}: { type: string; name: string; address: string; phone: string | null }) {
  return (
    <div className="p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center shrink-0">
        <MapPin className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {type}
        </div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-[var(--color-foreground-muted)]">{address}</div>
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="grid place-items-center w-9 h-9 rounded-full bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)]"
          aria-label="Appeler"
        >
          <Phone className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
