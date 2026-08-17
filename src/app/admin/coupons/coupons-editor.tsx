"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";

interface Coupon {
  id?: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number | null;
  min_order: number | null;
  max_redemptions: number | null;
  per_customer_limit: number | null;
  starts_at?: string;
  ends_at?: string | null;
  is_active: boolean;
  redemptions_count?: number;
}

const empty: Coupon = {
  code: "",
  description: "",
  type: "percentage",
  value: 10,
  min_order: null,
  max_redemptions: null,
  per_customer_limit: 1,
  is_active: true,
};

export function CouponsEditor({ initial }: { initial: Coupon[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Coupon[]>(initial);
  const [draft, setDraft] = useState<Coupon>(empty);
  const [busy, startTransition] = useTransition();

  function updateRow(i: number, patch: Partial<Coupon>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function save(row: Coupon) {
    startTransition(async () => {
      await fetch("/api/v1/admin/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...row,
          value: row.value != null ? Number(row.value) : null,
          min_order: row.min_order != null ? Number(row.min_order) : null,
          max_redemptions: row.max_redemptions != null ? Number(row.max_redemptions) : null,
          per_customer_limit: row.per_customer_limit != null ? Number(row.per_customer_limit) : null,
        }),
      });
      router.refresh();
    });
  }

  function add() {
    if (!draft.code) return;
    startTransition(async () => {
      await fetch("/api/v1/admin/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          value: draft.value != null ? Number(draft.value) : null,
          min_order: draft.min_order != null ? Number(draft.min_order) : null,
        }),
      });
      setDraft(empty);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_2fr_100px_90px_90px_60px_60px_80px_100px] gap-2 text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)] px-1">
        <span>Code</span>
        <span>Description</span>
        <span>Type</span>
        <span>Valeur</span>
        <span>Min</span>
        <span>Max</span>
        <span>Actif</span>
        <span>Utilisé</span>
        <span></span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[1fr_2fr_100px_90px_90px_60px_60px_80px_100px] gap-2 items-center">
          <input value={r.code} onChange={(e) => updateRow(i, { code: e.target.value })} className={cell + " font-mono uppercase"} />
          <input value={r.description ?? ""} onChange={(e) => updateRow(i, { description: e.target.value })} className={cell} />
          <select value={r.type} onChange={(e) => updateRow(i, { type: e.target.value as Coupon["type"] })} className={cell}>
            <option value="percentage">%</option>
            <option value="fixed_amount">DZD</option>
            <option value="free_shipping">Livraison</option>
          </select>
          <input type="number" value={r.value ?? 0} onChange={(e) => updateRow(i, { value: Number(e.target.value) })} className={cell + " text-right"} disabled={r.type === "free_shipping"} />
          <input type="number" placeholder="—" value={r.min_order ?? ""} onChange={(e) => updateRow(i, { min_order: e.target.value === "" ? null : Number(e.target.value) })} className={cell + " text-right"} />
          <input type="number" placeholder="∞" value={r.max_redemptions ?? ""} onChange={(e) => updateRow(i, { max_redemptions: e.target.value === "" ? null : Number(e.target.value) })} className={cell + " text-right"} />
          <input type="checkbox" checked={r.is_active} onChange={(e) => updateRow(i, { is_active: e.target.checked })} className="w-5 h-5 mx-auto" />
          <span className="text-xs text-center">{r.redemptions_count ?? 0}</span>
          <button onClick={() => save(r)} disabled={busy} className="h-9 rounded bg-[var(--color-primary)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1">
            <Check className="w-3.5 h-3.5" /> OK
          </button>
        </div>
      ))}

      <div className="pt-4 border-t border-[var(--color-border)] mt-4">
        <div className="grid grid-cols-[1fr_2fr_100px_90px_90px_60px_60px_60px_100px] gap-2 items-center">
          <input placeholder="CODE" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} className={cell + " font-mono"} />
          <input placeholder="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={cell} />
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Coupon["type"] })} className={cell}>
            <option value="percentage">%</option>
            <option value="fixed_amount">DZD</option>
            <option value="free_shipping">Livraison</option>
          </select>
          <input type="number" value={draft.value ?? 0} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} className={cell + " text-right"} />
          <input type="number" placeholder="Min" value={draft.min_order ?? ""} onChange={(e) => setDraft({ ...draft, min_order: e.target.value === "" ? null : Number(e.target.value) })} className={cell + " text-right"} />
          <input type="number" placeholder="Max" value={draft.max_redemptions ?? ""} onChange={(e) => setDraft({ ...draft, max_redemptions: e.target.value === "" ? null : Number(e.target.value) })} className={cell + " text-right"} />
          <div />
          <div />
          <button onClick={add} disabled={busy || !draft.code} className="h-9 rounded bg-[var(--color-primary)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Créer
          </button>
        </div>
      </div>
    </div>
  );
}

const cell = "h-9 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
