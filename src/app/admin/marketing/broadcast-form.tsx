"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  nouveau: "Nouveaux clients",
  actif: "Actifs",
  fidele: "Fidèles",
  vip: "VIP",
  inactif: "Inactifs",
};

export function BroadcastForm({ segments }: { segments: Record<string, number> }) {
  const [segment, setSegment] = useState("actif");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, startTransition] = useTransition();
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    setOk(null);
    if (!title.trim()) {
      setError("Titre requis.");
      return;
    }
    startTransition(async () => {
      const r = await fetch("/api/v1/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          segment,
          title,
          body: body || undefined,
          link_url: linkUrl || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Erreur");
        return;
      }
      setOk(`Envoyée à ${j.data.sent} client(s).`);
      setTitle("");
      setBody("");
      setLinkUrl("");
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Segment</div>
          <select value={segment} onChange={(e) => setSegment(e.target.value)} className={cell}>
            {Object.entries(SEGMENT_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l} ({segments[k] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Lien optionnel</div>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/client/promotions" className={cell} />
        </label>
        <label className="space-y-1 md:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Titre</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={cell} />
        </label>
        <label className="space-y-1 md:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">Corps (optionnel)</div>
          <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} className={cell + " resize-none"} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        {ok && <span className="text-xs text-[var(--color-az-success)]">✓ {ok}</span>}
        {error && <span className="text-xs text-[var(--color-az-danger)]">{error}</span>}
        <button
          onClick={send}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-40"
        >
          <Send className="w-4 h-4" /> {busy ? "…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}

const cell = "w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
