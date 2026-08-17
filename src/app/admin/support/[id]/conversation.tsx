"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataCard } from "@/components/admin/data-card";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  body: string;
  created_at: string;
  sender_name?: string | null;
  sender_role?: string | null;
}

export function TicketConversation({
  ticketId,
  status,
  messages,
}: {
  ticketId: string;
  status: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, startTransition] = useTransition();
  const [newStatus, setNewStatus] = useState<string | undefined>();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      await fetch(`/api/v1/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text, status: newStatus }),
      });
      setText("");
      setNewStatus(undefined);
      router.refresh();
    });
  }

  return (
    <DataCard>
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-[var(--color-foreground-muted)]">Aucun échange pour l'instant.</p>
        ) : messages.map((m) => {
          const isAgent = m.sender_role && ["admin", "super_admin", "store_manager"].includes(m.sender_role);
          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                isAgent ? "ml-auto bg-[var(--color-primary)]/10" : "bg-[var(--color-surface-muted)]",
              )}
            >
              <div className="text-[10px] text-[var(--color-foreground-muted)] mb-1">
                {m.sender_name ?? "—"} · {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrire une réponse…"
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={newStatus ?? status}
            onChange={(e) => setNewStatus(e.target.value === status ? undefined : e.target.value)}
            className="h-9 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs"
          >
            <option value="open">Ouvert</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolu</option>
            <option value="closed">Fermé</option>
          </select>
          <button
            onClick={send}
            disabled={busy || !text.trim()}
            className="ml-auto h-9 px-4 rounded bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-40"
          >
            {busy ? "…" : "Envoyer"}
          </button>
        </div>
      </div>
    </DataCard>
  );
}
