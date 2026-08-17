"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LoyaltyConfigForm({
  initial,
}: {
  initial: { points_per_dzd: number; dzd_per_point: number; min_redeem_points: number };
}) {
  const router = useRouter();
  const [cfg, setCfg] = useState(initial);
  const [busy, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const r = await fetch("/api/v1/admin/loyalty-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          points_per_dzd: Number(cfg.points_per_dzd),
          dzd_per_point: Number(cfg.dzd_per_point),
          min_redeem_points: Number(cfg.min_redeem_points),
        }),
      });
      if (!r.ok) {
        const j = await r.json();
        setError(j?.error?.message ?? "Erreur");
        return;
      }
      setOk(true);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <label className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Points gagnés par DZD dépensé</div>
        <input type="number" step="0.01" value={cfg.points_per_dzd} onChange={(e) => setCfg({ ...cfg, points_per_dzd: Number(e.target.value) })} className={cell} />
      </label>
      <label className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Valeur d'1 point (DZD)</div>
        <input type="number" step="0.01" value={cfg.dzd_per_point} onChange={(e) => setCfg({ ...cfg, dzd_per_point: Number(e.target.value) })} className={cell} />
      </label>
      <label className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Points minimum pour utiliser</div>
        <input type="number" step="1" value={cfg.min_redeem_points} onChange={(e) => setCfg({ ...cfg, min_redeem_points: Number(e.target.value) })} className={cell} />
      </label>
      <div className="md:col-span-3 flex items-center justify-end gap-3">
        {ok && <span className="text-xs text-[var(--color-az-success)]">Enregistré ✓</span>}
        {error && <span className="text-xs text-[var(--color-az-danger)]">{error}</span>}
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">
          {busy ? "…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

const cell = "w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
