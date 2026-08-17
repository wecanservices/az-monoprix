"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, ShoppingCart } from "lucide-react";
import { formatDZD } from "@/utils/money";
import { ProductImage } from "@/components/shared/product-image";
import { PriceTag } from "@/components/shared/price-tag";

interface Suggestion {
  sku: string;
  product_id: string;
  name_fr: string;
  quantity: number;
  reason: string;
  price: number;
  promo_price: number | null;
  image_url: string | null;
}

const EXAMPLES = [
  "Prépare-moi les courses pour 4 personnes cette semaine",
  "Barbecue pour 6 personnes, budget 6000 DA",
  "Petit déjeuner sain pour la semaine",
  "Produits pour bébé de 6 mois",
];

export function AiShoppingChat() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [people, setPeople] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [fallback, setFallback] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, startTransition] = useTransition();
  const [addingAll, setAddingAll] = useState(false);

  function ask(overridePrompt?: string) {
    const q = (overridePrompt ?? prompt).trim();
    if (!q) return;
    setSuggestions([]);
    setMessage(null);
    startTransition(async () => {
      const r = await fetch("/api/v1/ai/shopping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: q,
          budget: budget ? Number(budget) : null,
          people: people ? Number(people) : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(j?.error?.message ?? "Erreur");
        return;
      }
      setAvailable(j.data.available);
      setFallback(!!j.data.fallback);
      setMessage(j.data.message ?? null);
      setSuggestions(j.data.suggestions ?? []);
      setTotal(j.data.total_estimate ?? 0);
    });
  }

  async function addAllToCart() {
    setAddingAll(true);
    for (const s of suggestions) {
      await fetch("/api/v1/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: s.product_id, quantity: s.quantity }),
      });
    }
    setAddingAll(false);
    router.push("/client/cart");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3 space-y-3">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex : Repas pour 4 personnes, budget 5000 DA, sans porc"
          className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-sm resize-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs space-y-1">
            <div className="text-[10px] uppercase text-[var(--color-foreground-muted)]">Budget (DA)</div>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="—" className={cell} />
          </label>
          <label className="text-xs space-y-1">
            <div className="text-[10px] uppercase text-[var(--color-foreground-muted)]">Personnes</div>
            <input type="number" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="—" className={cell} />
          </label>
        </div>
        <button
          onClick={() => ask()}
          disabled={busy}
          className="w-full h-11 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {busy ? "L'assistant réfléchit…" : "Préparer mon panier"}
        </button>
      </div>

      {suggestions.length === 0 && !busy && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-[var(--color-foreground-muted)]">Exemples</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => { setPrompt(e); ask(e); }}
                className="text-xs px-3 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-left"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div
          className={
            "rounded-xl p-3 text-sm " +
            (available === false
              ? "bg-[var(--color-az-warning-soft)] border border-[var(--color-az-warning)]/30 text-[var(--color-az-warning)]"
              : "bg-[var(--color-surface)] border border-[var(--color-border)]")
          }
        >
          {fallback && <div className="text-[10px] uppercase font-bold mb-1">Mode dégradé</div>}
          {message}
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {suggestions.map((s) => (
              <div key={s.sku} className="p-3 flex items-center gap-3">
                <ProductImage src={s.image_url} alt={s.name_fr} className="w-14 h-14 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {s.quantity > 1 && <span className="text-[var(--color-primary)]">{s.quantity}× </span>}
                    {s.name_fr}
                  </div>
                  {s.reason && (
                    <div className="text-xs text-[var(--color-foreground-muted)] italic line-clamp-1">
                      « {s.reason} »
                    </div>
                  )}
                  <PriceTag price={s.price} promoPrice={s.promo_price} size="sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-16 z-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)] p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[10px] uppercase text-[var(--color-foreground-muted)]">Estimation panier</div>
              <div className="text-lg font-bold">{formatDZD(total)}</div>
            </div>
            <button
              onClick={addAllToCart}
              disabled={addingAll}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
            >
              <ShoppingCart className="w-4 h-4" />
              {addingAll ? "…" : "Tout ajouter"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const cell = "w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
