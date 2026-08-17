"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataCard } from "@/components/admin/data-card";

interface Product { id: string; sku: string; name_fr: string }
interface Promo {
  id?: string;
  code?: string | null;
  name?: string;
  description?: string | null;
  type?: "percentage" | "fixed_amount" | "free_shipping";
  value?: number | null;
  min_order?: number | null;
  starts_at?: string;
  ends_at?: string | null;
  is_active?: boolean;
  product_ids?: string[];
}

export function PromotionForm({
  promo,
  products,
}: {
  promo?: Promo;
  products: Product[];
}) {
  const router = useRouter();
  const isNew = !promo?.id;
  const [form, setForm] = useState<Promo>({
    type: "percentage",
    is_active: true,
    ...promo,
    starts_at: promo?.starts_at ? promo.starts_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
    ends_at: promo?.ends_at ? promo.ends_at.slice(0, 16) : null,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set(promo?.product_ids ?? []));
  const [search, setSearch] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 100);
    return products
      .filter((p) => p.name_fr.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 100);
  }, [search, products]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const body = {
        ...form,
        id: promo?.id,
        value: form.value != null ? Number(form.value) : null,
        min_order: form.min_order != null ? Number(form.min_order) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        product_ids: Array.from(selected),
      };
      const r = await fetch("/api/v1/admin/promotions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Erreur");
        return;
      }
      if (isNew) router.push(`/admin/promotions/${j.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <DataCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Nom *"><input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cell} /></F>
          <F label="Code (optionnel)"><input placeholder="RAMADAN25" value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} className={cell + " font-mono"} /></F>
          <F label="Description" full>
            <input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cell} />
          </F>
          <F label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Promo["type"] })} className={cell}>
              <option value="percentage">Pourcentage</option>
              <option value="fixed_amount">Montant fixe</option>
              <option value="free_shipping">Livraison offerte</option>
            </select>
          </F>
          <F label={form.type === "percentage" ? "Valeur (%)" : "Valeur (DZD)"}>
            <input type="number" step="1" value={form.value ?? 0} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className={cell} disabled={form.type === "free_shipping"} />
          </F>
          <F label="Min. commande (DZD)">
            <input type="number" step="1" value={form.min_order ?? 0} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} className={cell} />
          </F>
          <F label="Actif">
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-5 h-5" />
          </F>
          <F label="Début">
            <input type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={cell} />
          </F>
          <F label="Fin (optionnel)">
            <input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value || null })} className={cell} />
          </F>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-[var(--color-az-danger)]/40 bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)] px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">
            {busy ? "Enregistrement…" : isNew ? "Créer la promotion" : "Enregistrer"}
          </button>
        </div>
      </DataCard>

      <DataCard>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Produits éligibles ({selected.size})</h2>
          <p className="text-xs text-[var(--color-foreground-muted)]">Laisser vide = s'applique à tout le catalogue.</p>
        </div>
        <input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cell + " mb-3"}
        />
        <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]">
          {filtered.map((p) => {
            const on = selected.has(p.id);
            return (
              <label key={p.id} className="flex items-center gap-3 py-2 cursor-pointer">
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="w-4 h-4" />
                <span className="text-xs font-mono text-[var(--color-foreground-muted)] w-24 truncate">{p.sku}</span>
                <span className="text-sm">{p.name_fr}</span>
              </label>
            );
          })}
        </div>
      </DataCard>
    </div>
  );
}

function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">{label}</div>
      {children}
    </div>
  );
}

const cell = "w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
