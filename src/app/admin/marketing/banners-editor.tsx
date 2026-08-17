"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

interface Banner {
  id?: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  position: number;
  is_active: boolean;
}

const empty: Banner = { title: "", image_url: "", link_url: "", position: 0, is_active: true };

export function BannersEditor({ initial }: { initial: Banner[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Banner[]>(initial);
  const [draft, setDraft] = useState<Banner>({ ...empty, position: initial.length + 1 });
  const [busy, startTransition] = useTransition();

  function updateRow(i: number, patch: Partial<Banner>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function save(row: Banner) {
    startTransition(async () => {
      await fetch("/api/v1/admin/banners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...row, position: Number(row.position) }),
      });
      router.refresh();
    });
  }

  function del(id?: string) {
    if (!id || !confirm("Supprimer cette bannière ?")) return;
    startTransition(async () => {
      await fetch(`/api/v1/admin/banners?id=${id}`, { method: "DELETE" });
      setRows((rs) => rs.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  function add() {
    if (!draft.image_url) return;
    startTransition(async () => {
      await fetch("/api/v1/admin/banners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, position: Number(draft.position) }),
      });
      setDraft({ ...empty, position: rows.length + 2 });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[80px_1fr_1fr_1fr_60px_60px_120px] gap-2 items-center">
          {r.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.image_url} alt="" className="w-16 h-16 rounded object-cover" />
          ) : (
            <div className="w-16 h-16 rounded bg-[var(--color-surface-muted)]" />
          )}
          <input value={r.title ?? ""} onChange={(e) => updateRow(i, { title: e.target.value })} placeholder="Titre" className={cell} />
          <input value={r.image_url} onChange={(e) => updateRow(i, { image_url: e.target.value })} placeholder="URL image" className={cell + " font-mono text-xs"} />
          <input value={r.link_url ?? ""} onChange={(e) => updateRow(i, { link_url: e.target.value })} placeholder="Lien" className={cell + " font-mono text-xs"} />
          <input type="number" value={r.position} onChange={(e) => updateRow(i, { position: Number(e.target.value) })} className={cell + " text-center"} />
          <input type="checkbox" checked={r.is_active} onChange={(e) => updateRow(i, { is_active: e.target.checked })} className="w-5 h-5 mx-auto" />
          <div className="flex gap-1 justify-end">
            <button onClick={() => save(r)} disabled={busy} className="h-8 px-2 rounded bg-[var(--color-primary)] text-white text-xs font-semibold inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> OK
            </button>
            <button onClick={() => del(r.id)} disabled={busy} className="w-8 h-8 grid place-items-center rounded border border-[var(--color-border)] text-[var(--color-az-danger)]">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-[var(--color-border)] mt-4 grid grid-cols-[80px_1fr_1fr_1fr_60px_60px_120px] gap-2 items-center">
        <div className="w-16 h-16 rounded bg-[var(--color-surface-muted)] grid place-items-center text-xs text-[var(--color-foreground-muted)]">Nouv.</div>
        <input placeholder="Titre" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={cell} />
        <input placeholder="URL image" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} className={cell + " font-mono text-xs"} />
        <input placeholder="Lien" value={draft.link_url ?? ""} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} className={cell + " font-mono text-xs"} />
        <input type="number" value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })} className={cell + " text-center"} />
        <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} className="w-5 h-5 mx-auto" />
        <button onClick={add} disabled={busy || !draft.image_url} className="h-9 rounded bg-[var(--color-primary)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>
    </div>
  );
}

const cell = "h-9 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
