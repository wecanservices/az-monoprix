"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataCard } from "@/components/admin/data-card";
import { formatDZD } from "@/utils/money";

interface Store { id: string; code: string; name: string }
interface StorePricing { store_id: string; price: number; promo_price: number | null; is_available: boolean }

export function StorePricingPanel({
  productId,
  basePrice,
  stores,
  current,
}: {
  productId: string;
  basePrice: number;
  stores: Store[];
  current: StorePricing[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, StorePricing>>(() => {
    const map: Record<string, StorePricing> = {};
    for (const s of stores) {
      const cur = current.find((c) => c.store_id === s.id);
      map[s.id] = cur ?? { store_id: s.id, price: basePrice, promo_price: null, is_available: true };
    }
    return map;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function save(storeId: string) {
    const d = drafts[storeId];
    setSavingId(storeId);
    startTransition(async () => {
      await fetch(`/api/v1/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "set_store_price",
          storeId,
          price: Number(d.price),
          promoPrice: d.promo_price != null ? Number(d.promo_price) : null,
          isAvailable: d.is_available,
        }),
      });
      setSavingId(null);
      router.refresh();
    });
  }

  return (
    <DataCard>
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Prix & disponibilité par magasin</h2>
        <p className="text-xs text-[var(--color-foreground-muted)]">
          Le prix par magasin surcharge le prix conseillé ({formatDZD(basePrice)}).
        </p>
      </div>
      <div className="space-y-3">
        {stores.map((s) => {
          const d = drafts[s.id];
          const percent =
            d.promo_price != null && d.promo_price < d.price
              ? Math.round(((d.price - d.promo_price) / d.price) * 100)
              : null;
          return (
            <div
              key={s.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_100px_auto] items-center gap-3 p-3 rounded-xl border border-[var(--color-border)]"
            >
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-[var(--color-foreground-muted)]">{s.code}</div>
              </div>
              <label className="text-xs">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Prix</div>
                <input
                  type="number"
                  step="1"
                  value={d.price}
                  onChange={(e) => setDrafts((x) => ({ ...x, [s.id]: { ...d, price: Number(e.target.value) } }))}
                  className="w-full h-9 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
                />
              </label>
              <label className="text-xs">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Promo</div>
                <input
                  type="number"
                  step="1"
                  value={d.promo_price ?? ""}
                  onChange={(e) =>
                    setDrafts((x) => ({
                      ...x,
                      [s.id]: { ...d, promo_price: e.target.value === "" ? null : Number(e.target.value) },
                    }))
                  }
                  placeholder="—"
                  className="w-full h-9 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
                />
              </label>
              <label className="text-xs flex items-center gap-2 mt-2 md:mt-0">
                <input
                  type="checkbox"
                  checked={d.is_available}
                  onChange={(e) => setDrafts((x) => ({ ...x, [s.id]: { ...d, is_available: e.target.checked } }))}
                />
                Disponible
              </label>
              <div className="flex items-center gap-2 justify-end">
                {percent != null && (
                  <span className="text-[10px] font-bold text-[var(--color-az-promo)]">-{percent}%</span>
                )}
                <button
                  type="button"
                  onClick={() => save(s.id)}
                  disabled={savingId === s.id}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold"
                >
                  {savingId === s.id ? "…" : "Enregistrer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </DataCard>
  );
}
