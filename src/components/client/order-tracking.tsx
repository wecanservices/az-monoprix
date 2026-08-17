"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Package, Truck, Home, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS, type OrderStatus } from "@/constants/order-status";
import { cn } from "@/lib/utils";

/**
 * Six-step timeline visible to the customer. The DB has more granular
 * driver statuses (go_to_store / at_store …) which we collapse into
 * the customer-facing "En livraison" phase.
 */
const STEPS: Array<{ key: OrderStatus[]; label: string; icon: typeof Package }> = [
  { key: [ORDER_STATUS.CONFIRMED], label: "Confirmée", icon: CheckCircle2 },
  { key: [ORDER_STATUS.PREPARING, ORDER_STATUS.PARTIALLY_AVAILABLE], label: "En préparation", icon: Package },
  { key: [ORDER_STATUS.READY], label: "Prête", icon: Clock },
  { key: [ORDER_STATUS.ASSIGNED, ORDER_STATUS.ACCEPTED], label: "Livreur assigné", icon: Truck },
  {
    key: [
      ORDER_STATUS.GO_TO_STORE,
      ORDER_STATUS.AT_STORE,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.GO_TO_CUSTOMER,
      ORDER_STATUS.AT_CUSTOMER,
    ],
    label: "En livraison",
    icon: Truck,
  },
  { key: [ORDER_STATUS.DELIVERED], label: "Livrée", icon: Home },
];

function stepIndex(status: OrderStatus): number {
  const idx = STEPS.findIndex((s) => s.key.includes(status));
  return idx >= 0 ? idx : 0;
}

export function OrderTracking({
  orderId,
  initialStatus,
  otpCode,
  driverName,
  scheduledEnd,
}: {
  orderId: string;
  initialStatus: OrderStatus;
  otpCode?: string | null;
  driverName?: string | null;
  scheduledEnd?: string | null;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [driver, setDriver] = useState(driverName ?? null);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const next = (payload.new as { status: OrderStatus }).status;
          if (next) setStatus(next);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `order_id=eq.${orderId}` },
        async (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row: any = payload.new ?? payload.old;
          if (!row?.driver_id) return;
          const { data } = await sb
            .from("profiles")
            .select("full_name")
            .eq("id", row.driver_id)
            .maybeSingle();
          if (data) setDriver(data.full_name);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [orderId]);

  const active = stepIndex(status);
  const cancelled = status === "cancelled";

  return (
    <div className="space-y-4">
      {cancelled ? (
        <div className="rounded-2xl bg-[var(--color-az-danger-soft)] border border-[var(--color-az-danger)]/30 p-4 flex items-center gap-3 text-[var(--color-az-danger)]">
          <XCircle className="w-5 h-5" />
          <div>
            <div className="font-semibold">Commande annulée</div>
            <p className="text-sm">Nous vous avons contacté à ce sujet.</p>
          </div>
        </div>
      ) : (
        <ol className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-3">
          {STEPS.map((s, i) => {
            const done = i < active || status === ORDER_STATUS.DELIVERED;
            const current = i === active && status !== ORDER_STATUS.DELIVERED;
            return (
              <li key={s.label} className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full grid place-items-center shrink-0 border",
                    done && "bg-[var(--color-az-success)] border-[var(--color-az-success)] text-white",
                    current && "border-[var(--color-primary)] text-[var(--color-primary)] animate-pulse",
                    !done && !current && "border-[var(--color-border)] text-[var(--color-foreground-muted)]",
                  )}
                >
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="pt-1.5">
                  <div className={cn("text-sm font-medium", !done && !current && "text-[var(--color-foreground-muted)]")}>
                    {s.label}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {driver && !cancelled && status !== ORDER_STATUS.DELIVERED && (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white grid place-items-center font-semibold">
            {driver.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{driver}</div>
            <div className="text-xs text-[var(--color-foreground-muted)]">Votre livreur</div>
          </div>
        </div>
      )}

      {otpCode && (status === ORDER_STATUS.PICKED_UP || status === ORDER_STATUS.GO_TO_CUSTOMER || status === ORDER_STATUS.AT_CUSTOMER) && (
        <div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-az-red-700)] text-white p-4 text-center">
          <div className="text-xs uppercase tracking-widest opacity-80">Code de livraison</div>
          <div className="text-4xl font-black tracking-[0.4em] mt-1">{otpCode}</div>
          <p className="text-xs opacity-80 mt-2">Communiquez ce code au livreur à la remise du colis.</p>
        </div>
      )}

      {scheduledEnd && !cancelled && status !== ORDER_STATUS.DELIVERED && (
        <div className="text-xs text-center text-[var(--color-foreground-muted)]">
          Livraison prévue avant{" "}
          <strong>
            {new Date(scheduledEnd).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </strong>
        </div>
      )}
    </div>
  );
}
