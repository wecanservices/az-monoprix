"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";

/**
 * Inline stock adjuster: +/- 1 unit or a custom delta with reason.
 * Writes to /api/v1/admin/inventory (POST) → creates an
 * inventory_movement, trigger updates the aggregate row.
 */
export function StockAdjuster({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [custom, setCustom] = useState("");
  const [reason, setReason] = useState("");

  function post(delta: number, reasonText: string | null) {
    startTransition(async () => {
      await fetch("/api/v1/admin/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId, productId, delta, reason: reasonText }),
      });
      setCustom("");
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => post(-1, "Ajustement -1")}
        disabled={busy}
        className="w-7 h-7 grid place-items-center rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => post(1, "Ajustement +1")}
        disabled={busy}
        className="w-7 h-7 grid place-items-center rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        placeholder="±"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="w-16 h-7 px-1 text-xs text-center rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
      />
      <input
        placeholder="Raison"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-24 h-7 px-1 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
      />
      <button
        type="button"
        onClick={() => custom && post(Number(custom), reason || null)}
        disabled={busy || !custom}
        className="h-7 px-2 rounded bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-40"
      >
        Ajuster
      </button>
    </div>
  );
}
