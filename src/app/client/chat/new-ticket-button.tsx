"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export function NewTicketButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    if (!subject.trim()) {
      setError("Sujet requis.");
      return;
    }
    startTransition(async () => {
      const r = await fetch("/api/v1/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          subject,
          description: description || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Erreur");
        return;
      }
      setOpen(false);
      router.push(`/client/chat/${j.data.id}`);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-full bg-[var(--color-primary)] text-white font-semibold"
      >
        <Plus className="w-3.5 h-3.5" /> Nouveau ticket
      </button>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 grid place-items-end sm:place-items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Nouveau ticket</h2>
              <button onClick={() => setOpen(false)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={cell}>
              <option value="order">Commande</option>
              <option value="product">Produit</option>
              <option value="delivery">Livraison</option>
              <option value="driver">Livreur</option>
              <option value="payment">Paiement</option>
              <option value="refund">Remboursement</option>
              <option value="other">Autre</option>
            </select>
            <input placeholder="Sujet" value={subject} onChange={(e) => setSubject(e.target.value)} className={cell} />
            <textarea placeholder="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={cell + " resize-none"} />
            {error && <div className="text-xs text-[var(--color-az-danger)]">{error}</div>}
            <button
              onClick={send}
              disabled={busy}
              className="w-full h-11 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
            >
              {busy ? "Envoi…" : "Créer le ticket"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const cell = "w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm";
