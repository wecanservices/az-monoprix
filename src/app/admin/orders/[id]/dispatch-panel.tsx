"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, Star, Zap } from "lucide-react";
import type { DispatchCandidate } from "@/services/dispatch";

/**
 * Present ranked drivers so the admin can 1-click assign the best one
 * or override. The scoring is done in Postgres (`available_drivers_for_order`).
 */
export function DispatchPanel({
  orderId,
  candidates,
}: {
  orderId: string;
  candidates: DispatchCandidate[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function assign(driverId: string) {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/v1/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ driverId }),
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
    <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold">Assignation livreur</h2>
        <p className="text-xs text-[var(--color-foreground-muted)]">
          Livreurs en ligne classés par score (distance + charge − note).
        </p>
      </div>
      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-[var(--color-az-danger)]/40 bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)] px-3 py-2 text-xs">
          {error}
        </div>
      )}
      {candidates.length === 0 ? (
        <div className="p-4 text-sm text-[var(--color-foreground-muted)]">
          Aucun livreur en ligne pour l'instant.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {candidates.map((c, i) => (
            <li key={c.driver_id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white grid place-items-center text-sm font-semibold">
                {(c.full_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {c.full_name ?? "Livreur"} {i === 0 && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">Recommandé</span>}
                </div>
                <div className="text-xs text-[var(--color-foreground-muted)] flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Bike className="w-3 h-3" /> {c.distance_km.toFixed(1)} km</span>
                  <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3" /> {c.active_load} en cours</span>
                  <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" /> {c.rating.toFixed(1)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => assign(c.driver_id)}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white font-semibold"
              >
                Assigner
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
