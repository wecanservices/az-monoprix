"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Check } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string | null;
  icon: string | null;
  position: number;
  is_active: boolean;
}

export function CategoriesEditor({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Category[]>(initial);
  const [newRow, setNewRow] = useState({ slug: "", name_fr: "", icon: "" });
  const [busy, startTransition] = useTransition();

  function updateRow(i: number, patch: Partial<Category>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function save(row: Category) {
    startTransition(async () => {
      await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(row),
      });
      router.refresh();
    });
  }

  function del(id: string) {
    if (!confirm("Supprimer cette catégorie ?")) return;
    startTransition(async () => {
      await fetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
      setRows((rs) => rs.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  function add() {
    if (!newRow.slug || !newRow.name_fr) return;
    startTransition(async () => {
      await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: newRow.slug,
          name_fr: newRow.name_fr,
          icon: newRow.icon || null,
          position: rows.length + 1,
        }),
      });
      setNewRow({ slug: "", name_fr: "", icon: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[60px_1fr_2fr_60px_60px] gap-2 text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)] px-2">
        <span>Icône</span>
        <span>Slug</span>
        <span>Nom (FR)</span>
        <span>Ordre</span>
        <span></span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[60px_1fr_2fr_60px_120px] gap-2 items-center">
          <input value={r.icon ?? ""} onChange={(e) => updateRow(i, { icon: e.target.value })} className={cellCls + " text-center text-lg"} />
          <input value={r.slug} onChange={(e) => updateRow(i, { slug: e.target.value })} className={cellCls + " font-mono text-xs"} />
          <input value={r.name_fr} onChange={(e) => updateRow(i, { name_fr: e.target.value })} className={cellCls} />
          <input type="number" value={r.position} onChange={(e) => updateRow(i, { position: Number(e.target.value) })} className={cellCls} />
          <div className="flex gap-1 justify-end">
            <button onClick={() => save(r)} disabled={busy} className="w-8 h-8 grid place-items-center rounded bg-[var(--color-primary)] text-white">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => del(r.id)} disabled={busy} className="w-8 h-8 grid place-items-center rounded border border-[var(--color-border)] text-[var(--color-az-danger)]">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <div className="pt-3 border-t border-[var(--color-border)] mt-3 grid grid-cols-[60px_1fr_2fr_60px_120px] gap-2 items-center">
        <input placeholder="🛒" value={newRow.icon} onChange={(e) => setNewRow({ ...newRow, icon: e.target.value })} className={cellCls + " text-center text-lg"} />
        <input placeholder="slug" value={newRow.slug} onChange={(e) => setNewRow({ ...newRow, slug: e.target.value })} className={cellCls + " font-mono text-xs"} />
        <input placeholder="Nouvelle catégorie" value={newRow.name_fr} onChange={(e) => setNewRow({ ...newRow, name_fr: e.target.value })} className={cellCls} />
        <div />
        <button onClick={add} disabled={busy || !newRow.slug} className="inline-flex items-center justify-center gap-1 h-9 rounded bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-40">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
    </div>
  );
}

const cellCls =
  "h-9 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
