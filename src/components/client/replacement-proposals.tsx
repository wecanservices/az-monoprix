"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDZD } from "@/utils/money";

interface Proposal {
  id: string;
  quantity: number;
  customer_response: string | null;
  original_item: { product_snapshot: { name?: string } };
  replacement: {
    id: string;
    name_fr: string;
    base_price: number;
    images: { url: string; position: number }[];
  };
}

/**
 * The preparator flagged a product as unavailable and proposed a
 * substitution. The customer accepts / refuses / requests refund from
 * this card set. Real-time-safe (parent revalidates on Realtime event).
 */
export function ReplacementProposals({
  orderId,
  proposals,
}: {
  orderId: string;
  proposals: Proposal[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(replacementId: string, response: "accepted" | "rejected" | "refunded") {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/v1/orders/${orderId}/replacement`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ replacementId, response }),
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
    <section className="rounded-2xl bg-[var(--color-az-warning-soft)] border border-[var(--color-az-warning)]/30 p-4 space-y-3">
      <div>
        <div className="font-semibold text-[var(--color-az-warning)]">Produit indisponible</div>
        <p className="text-sm">
          Nous vous proposons un remplaçant. Acceptez ou demandez un remboursement.
        </p>
      </div>
      {error && (
        <div className="text-xs text-[var(--color-az-danger)]">{error}</div>
      )}
      <ul className="space-y-3">
        {proposals.map((p) => (
          <li key={p.id} className="rounded-xl bg-[var(--color-surface)] p-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">
                Produit demandé
              </div>
              <div className="text-sm line-through text-[var(--color-foreground-muted)]">
                {p.original_item?.product_snapshot?.name ?? "Article"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">
                Proposé
              </div>
              <div className="text-sm font-semibold">
                {p.replacement?.name_fr} — {formatDZD(Number(p.replacement?.base_price))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => respond(p.id, "rejected")}
                disabled={busy}
                className="h-9 text-xs rounded-full border border-[var(--color-border)] font-medium"
              >
                Refuser
              </button>
              <button
                type="button"
                onClick={() => respond(p.id, "refunded")}
                disabled={busy}
                className="h-9 text-xs rounded-full border border-[var(--color-border)] font-medium"
              >
                Rembourser
              </button>
              <button
                type="button"
                onClick={() => respond(p.id, "accepted")}
                disabled={busy}
                className="h-9 text-xs rounded-full bg-[var(--color-primary)] text-white font-semibold"
              >
                Accepter
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
