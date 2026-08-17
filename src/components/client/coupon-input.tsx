"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, X, Check } from "lucide-react";

export function CouponInput({ initialCode }: { initialCode: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [applied, setApplied] = useState(!!initialCode);
  const [amountOff, setAmountOff] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function apply() {
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/v1/cart/coupon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Code invalide");
        setApplied(false);
        setAmountOff(null);
        return;
      }
      setApplied(true);
      setAmountOff(j.data.amountOff ?? 0);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await fetch("/api/v1/cart/coupon", { method: "DELETE" });
      setCode("");
      setApplied(false);
      setAmountOff(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="w-4 h-4" />
        <span className="text-sm font-semibold">Code promo</span>
      </div>
      {applied ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-az-success-soft)] text-[var(--color-az-success)] text-sm">
            <Check className="w-4 h-4" />
            <span className="font-semibold font-mono">{code}</span>
            {amountOff != null && amountOff > 0 && (
              <span className="ml-1 text-xs">appliqué</span>
            )}
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="w-9 h-9 grid place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-az-danger)]"
            aria-label="Retirer le code"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="BIENVENUE"
            className="flex-1 h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono"
          />
          <button
            type="button"
            onClick={apply}
            disabled={busy || !code}
            className="px-4 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-40"
          >
            Appliquer
          </button>
        </div>
      )}
      {error && <div className="mt-2 text-xs text-[var(--color-az-danger)]">{error}</div>}
    </div>
  );
}
