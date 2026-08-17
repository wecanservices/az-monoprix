"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataCard } from "@/components/admin/data-card";

interface Category { id: string; name_fr: string; icon: string | null }
interface Brand { id: string; name: string }
interface Product {
  id?: string;
  sku?: string;
  barcode?: string | null;
  name_fr?: string;
  name_ar?: string | null;
  description_fr?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  base_price?: number;
  unit?: string | null;
  unit_size?: number | null;
  weight_grams?: number | null;
  is_active?: boolean;
  is_featured?: boolean;
}

export function ProductForm({
  product,
  categories,
  brands,
}: {
  product?: Product;
  categories: Category[];
  brands: Brand[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Product>({
    sku: "",
    name_fr: "",
    base_price: 0,
    unit: "pièce",
    is_active: true,
    ...product,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const isNew = !product?.id;

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const body = {
        ...form,
        id: product?.id,
        base_price: Number(form.base_price ?? 0),
        unit_size: form.unit_size != null ? Number(form.unit_size) : null,
        weight_grams: form.weight_grams != null ? Number(form.weight_grams) : null,
      };
      const r = await fetch("/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Erreur");
        return;
      }
      if (isNew) router.push(`/admin/products/${j.data.id}`);
      router.refresh();
    });
  }

  return (
    <DataCard>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="SKU *">
          <input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Code-barres">
          <input value={form.barcode ?? ""} onChange={(e) => set("barcode", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Nom (FR) *" full>
          <input value={form.name_fr ?? ""} onChange={(e) => set("name_fr", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Nom (AR)" full>
          <input dir="rtl" value={form.name_ar ?? ""} onChange={(e) => set("name_ar", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description (FR)" full>
          <textarea
            rows={3}
            value={form.description_fr ?? ""}
            onChange={(e) => set("description_fr", e.target.value)}
            className={inputCls + " resize-none"}
          />
        </Field>
        <Field label="Catégorie">
          <select value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)} className={inputCls}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name_fr}</option>
            ))}
          </select>
        </Field>
        <Field label="Marque">
          <select value={form.brand_id ?? ""} onChange={(e) => set("brand_id", e.target.value || null)} className={inputCls}>
            <option value="">—</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Prix conseillé (DZD) *">
          <input
            type="number"
            step="1"
            min={0}
            value={form.base_price ?? 0}
            onChange={(e) => set("base_price", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Unité">
          <input value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Taille unité">
          <input
            type="number"
            step="0.01"
            value={form.unit_size ?? 0}
            onChange={(e) => set("unit_size", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Poids (g)">
          <input
            type="number"
            step="1"
            value={form.weight_grams ?? 0}
            onChange={(e) => set("weight_grams", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Actif">
          <input type="checkbox" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-5 h-5" />
        </Field>
        <Field label="Mis en avant">
          <input type="checkbox" checked={!!form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="w-5 h-5" />
        </Field>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-[var(--color-az-danger)]/40 bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)] px-3 py-2 text-sm">
          {error}
        </div>
      )}
      <div className="flex justify-end mt-4 gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold"
        >
          {busy ? "Enregistrement…" : isNew ? "Créer" : "Enregistrer"}
        </button>
      </div>
    </DataCard>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-[var(--color-primary)]";

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}
