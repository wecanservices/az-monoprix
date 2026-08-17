"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ArrowRight } from "lucide-react";
import { formatDZD } from "@/utils/money";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  quantity: number;
  quantity_picked: number | null;
  unit_price: number | string;
  total: number | string;
  is_available: boolean | null;
  product_snapshot: { name?: string; sku?: string };
  product_id: string;
}

interface Order {
  id: string;
  status: string;
  items: OrderItem[];
}

const START_STATUSES = new Set(["confirmed"]);
const FINISH_STATUSES = new Set(["preparing", "partially_available"]);

export function PreparationPanel({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function call(body: unknown) {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/v1/admin/orders/${order.id}/prepare`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json();
        setError(j?.error?.message ?? "Erreur");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold">Préparation</h2>
        <div className="flex gap-2">
          {START_STATUSES.has(order.status) && (
            <button
              onClick={() => call({ action: "start" })}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white font-semibold"
            >
              Démarrer la préparation
            </button>
          )}
          {FINISH_STATUSES.has(order.status) && (
            <button
              onClick={() => call({ action: "finish" })}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-az-success)] text-white font-semibold inline-flex items-center gap-1"
            >
              Marquer prête <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-[var(--color-az-danger)]/40 bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)] px-3 py-2 text-xs">
          {error}
        </div>
      )}

      <ul className="divide-y divide-[var(--color-border)]">
        {order.items.map((it) => {
          const done = it.is_available !== false && (it.quantity_picked ?? 0) >= it.quantity;
          const missing = it.is_available === false;
          return (
            <li key={it.id} className={cn("p-4 flex items-center gap-3", missing && "opacity-70")}>
              <div className={cn("w-2 h-8 rounded-full",
                missing ? "bg-[var(--color-az-danger)]" :
                done ? "bg-[var(--color-az-success)]" :
                "bg-[var(--color-az-warning)]",
              )} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {it.quantity} × {it.product_snapshot?.name ?? "Produit"}
                </div>
                <div className="text-xs text-[var(--color-foreground-muted)]">
                  {formatDZD(Number(it.unit_price))} · {it.product_snapshot?.sku}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => call({ action: "mark_item", itemId: it.id, picked: it.quantity, unavailable: false })}
                  disabled={busy}
                  className={cn(
                    "w-8 h-8 rounded-full grid place-items-center",
                    done ? "bg-[var(--color-az-success)] text-white" : "border border-[var(--color-border)]",
                  )}
                  aria-label="Marquer picked"
                  title="Picked"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => call({ action: "mark_item", itemId: it.id, unavailable: true })}
                  disabled={busy}
                  className={cn(
                    "w-8 h-8 rounded-full grid place-items-center",
                    missing ? "bg-[var(--color-az-danger)] text-white" : "border border-[var(--color-border)]",
                  )}
                  aria-label="Marquer indisponible"
                  title="Indisponible"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
