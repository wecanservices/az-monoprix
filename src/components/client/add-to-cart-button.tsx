"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, ShoppingCart, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact add-to-cart button.
 * - Idle : "+" icon
 * - After first click : shows current qty with +/- controls
 * Local optimistic state + POSTs to /api/v1/cart/items.
 * The full cart page always re-fetches from server for authoritative state.
 */
export function AddToCartButton({
  productId,
  compact = true,
  onChange,
}: {
  productId: string;
  compact?: boolean;
  onChange?: (qty: number) => void;
}) {
  const [qty, setQty] = useState(0);
  const [busy, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  const push = (delta: number) => {
    const next = Math.max(0, qty + delta);
    setQty(next);
    onChange?.(next);
    startTransition(async () => {
      try {
        await fetch("/api/v1/cart/items", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, quantity: delta }),
        });
        setConfirmed(true);
        setTimeout(() => setConfirmed(false), 900);
      } catch {
        // Reverse optimistic change
        setQty((q) => q - delta);
      }
    });
  };

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => push(1)}
        disabled={busy}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--gradient-hero)] text-[var(--color-primary-foreground)] font-semibold shadow-[var(--shadow-glow-red)] transition-all duration-[var(--duration-fast)] hover:scale-105 active:scale-95",
          compact ? "h-8 w-8" : "h-10 px-4 text-sm",
        )}
        aria-label="Ajouter au panier"
      >
        {compact ? (
          <Plus className="w-4 h-4" strokeWidth={2.8} />
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            <span>Ajouter au panier</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] overflow-hidden",
        compact ? "h-8" : "h-9",
      )}
    >
      <button
        type="button"
        onClick={() => push(-1)}
        disabled={busy}
        className="w-8 h-full grid place-items-center hover:bg-black/15"
        aria-label="Retirer un"
      >
        <Minus className="w-4 h-4" strokeWidth={2.6} />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">
        {confirmed ? <Check className="w-4 h-4 inline" /> : qty}
      </span>
      <button
        type="button"
        onClick={() => push(1)}
        disabled={busy}
        className="w-8 h-full grid place-items-center hover:bg-black/15"
        aria-label="Ajouter un"
      >
        <Plus className="w-4 h-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}
