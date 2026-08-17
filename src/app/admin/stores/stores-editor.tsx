"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";

interface Store {
  id?: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  wilaya_code: string | null;
  opens_at: string | null;
  closes_at: string | null;
  prep_capacity: number;
  is_active: boolean;
}

export function StoresEditor({
  initial,
  wilayas,
}: {
  initial: Store[];
  wilayas: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Store[]>(initial);
  const [busy, startTransition] = useTransition();
  const [newRow, setNewRow] = useState<Store>({
    code: "",
    name: "",
    address: "",
    phone: "",
    wilaya_code: "16",
    opens_at: "08:00",
    closes_at: "22:00",
    prep_capacity: 20,
    is_active: true,
  });

  function updateRow(i: number, patch: Partial<Store>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function save(row: Store) {
    startTransition(async () => {
      await fetch("/api/v1/admin/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(row),
      });
      router.refresh();
    });
  }

  function add() {
    if (!newRow.code || !newRow.name) return;
    startTransition(async () => {
      await fetch("/api/v1/admin/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newRow),
      });
      setNewRow({ ...newRow, code: "", name: "", address: "", phone: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <div key={r.id} className="p-3 rounded-xl border border-[var(--color-border)] grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <F label="Code">
            <input value={r.code} onChange={(e) => updateRow(i, { code: e.target.value })} className={cell} />
          </F>
          <F label="Nom" span={2}>
            <input value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} className={cell} />
          </F>
          <F label="Wilaya">
            <select value={r.wilaya_code ?? ""} onChange={(e) => updateRow(i, { wilaya_code: e.target.value })} className={cell}>
              {wilayas.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </F>
          <F label="Téléphone">
            <input value={r.phone ?? ""} onChange={(e) => updateRow(i, { phone: e.target.value })} className={cell} />
          </F>
          <F label="Ouvre">
            <input type="time" value={(r.opens_at ?? "").slice(0, 5)} onChange={(e) => updateRow(i, { opens_at: e.target.value })} className={cell} />
          </F>
          <F label="Adresse" span={4}>
            <input value={r.address ?? ""} onChange={(e) => updateRow(i, { address: e.target.value })} className={cell} />
          </F>
          <F label="Ferme">
            <input type="time" value={(r.closes_at ?? "").slice(0, 5)} onChange={(e) => updateRow(i, { closes_at: e.target.value })} className={cell} />
          </F>
          <div className="flex items-end justify-end gap-2">
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={r.is_active} onChange={(e) => updateRow(i, { is_active: e.target.checked })} /> Actif
            </label>
            <button onClick={() => save(r)} disabled={busy} className="h-9 px-3 rounded bg-[var(--color-primary)] text-white text-xs font-semibold inline-flex items-center gap-1">
              <Check className="w-4 h-4" /> OK
            </button>
          </div>
        </div>
      ))}

      <div className="p-3 rounded-xl border border-dashed border-[var(--color-border-strong)] grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <F label="Code">
          <input placeholder="MONOPRIX-XXX" value={newRow.code} onChange={(e) => setNewRow({ ...newRow, code: e.target.value })} className={cell + " font-mono text-xs"} />
        </F>
        <F label="Nom" span={2}>
          <input value={newRow.name} onChange={(e) => setNewRow({ ...newRow, name: e.target.value })} className={cell} />
        </F>
        <F label="Wilaya">
          <select value={newRow.wilaya_code ?? "16"} onChange={(e) => setNewRow({ ...newRow, wilaya_code: e.target.value })} className={cell}>
            {wilayas.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
          </select>
        </F>
        <button onClick={add} disabled={busy} className="md:col-span-4 h-10 rounded bg-[var(--color-primary)] text-white text-sm font-semibold inline-flex items-center justify-center gap-1">
          <Plus className="w-4 h-4" /> Ajouter le magasin
        </button>
      </div>
    </div>
  );
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span ? `md:col-span-${span} space-y-1` : "space-y-1"}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">{label}</div>
      {children}
    </div>
  );
}
const cell = "w-full h-9 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
