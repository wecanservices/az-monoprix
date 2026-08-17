"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";

interface Turn { q: string; a: string; sources?: { key: string; label: string }[] }

const EXAMPLES = [
  "Quels sont les 5 produits les plus vendus cette semaine ?",
  "Quels produits risquent une rupture ?",
  "Quel est notre panier moyen sur 30 jours ?",
  "Combien avons-nous de clients VIP ?",
  "Quel livreur a fait le plus de courses ?",
];

export function AdminAiChat() {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, startTransition] = useTransition();

  function ask(text?: string) {
    const question = (text ?? q).trim();
    if (!question) return;
    startTransition(async () => {
      const r = await fetch("/api/v1/admin/ai/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const j = await r.json();
      setTurns((t) => [...t, {
        q: question,
        a: j?.data?.answer ?? j?.error?.message ?? "Erreur",
        sources: j?.data?.sources,
      }]);
      setQ("");
    });
  }

  return (
    <div className="space-y-3">
      {turns.length === 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-[var(--color-foreground-muted)]">Exemples</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => ask(e)}
                className="text-xs px-3 py-2 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-left"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i} className="space-y-2">
          <div className="ml-auto max-w-[85%] rounded-2xl bg-[var(--color-primary)]/10 px-3 py-2 text-sm">
            {t.q}
          </div>
          <div className="max-w-[85%] rounded-2xl bg-[var(--color-surface-muted)] px-3 py-2 text-sm whitespace-pre-wrap">
            {t.a}
            {t.sources && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-foreground-muted)]">
                Sources : {t.sources.map((s) => s.label).join(" · ")}
              </div>
            )}
          </div>
        </div>
      ))}

      {busy && (
        <div className="max-w-[85%] rounded-2xl bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-foreground-muted)]">
          L'assistant analyse vos données…
        </div>
      )}

      <div className="flex items-end gap-2 pt-3 border-t border-[var(--color-border)]">
        <textarea
          rows={2}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Posez votre question…"
          className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
        />
        <button
          onClick={() => ask()}
          disabled={busy || !q.trim()}
          className="w-11 h-11 grid place-items-center rounded-full bg-[var(--color-primary)] text-white disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
