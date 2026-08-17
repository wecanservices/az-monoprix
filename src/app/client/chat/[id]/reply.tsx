"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export function ClientTicketReply({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, startTransition] = useTransition();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      await fetch(`/api/v1/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Votre message…"
        className="flex-1 px-3 py-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none"
      />
      <button
        onClick={send}
        disabled={busy || !text.trim()}
        className="w-11 h-11 grid place-items-center rounded-full bg-[var(--color-primary)] text-white disabled:opacity-40"
        aria-label="Envoyer"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
