"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { OrderStatus } from "@/constants/order-status";
import { cn } from "@/lib/utils";

/**
 * State-machine driven action bar for the driver mission page.
 * The set of buttons follows what `advanceMission` (server) accepts —
 * we don't recompute it client-side; the API is the guard.
 */
type Step = { to: OrderStatus; label: string };

const NEXT: Record<string, Step> = {
  ready: { to: "accepted", label: "Accepter la mission" },
  assigned: { to: "accepted", label: "Accepter la mission" },
  accepted: { to: "go_to_store", label: "🏁 Je pars au magasin" },
  go_to_store: { to: "at_store", label: "📍 Je suis au magasin" },
  at_store: { to: "picked_up", label: "📦 Colis récupéré" },
  picked_up: { to: "go_to_customer", label: "🏁 Je pars chez le client" },
  go_to_customer: { to: "at_customer", label: "📍 Je suis chez le client" },
};

export function MissionActions({
  orderId,
  status,
  isMine,
  otp,
}: {
  orderId: string;
  status: OrderStatus;
  isMine: boolean;
  otp: string | null;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPool = !isMine && status === "ready";
  const step = NEXT[status];
  const showOtp = isMine && status === "at_customer";

  function claim() {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/v1/driver/orders/${orderId}/accept`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json();
        setError(j?.error?.message ?? "Impossible d'accepter.");
        return;
      }
      router.refresh();
    });
  }

  function refuse() {
    setError(null);
    startTransition(async () => {
      await fetch(`/api/v1/driver/orders/${orderId}/refuse`, { method: "POST" });
      router.push("/driver/orders");
    });
  }

  function advance(to: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/v1/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to }),
      });
      if (!r.ok) {
        const j = await r.json();
        setError(j?.error?.message ?? "Erreur de transition.");
        return;
      }
      router.refresh();
    });
  }

  function deliver() {
    setError(null);
    if (otpInput.length !== 4) {
      setError("Entrez le code à 4 chiffres du client.");
      return;
    }
    startTransition(async () => {
      const r = await fetch(`/api/v1/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: "delivered", otp: otpInput }),
      });
      if (!r.ok) {
        const j = await r.json();
        setError(j?.error?.message ?? "OTP invalide.");
        return;
      }
      router.push("/driver/orders");
    });
  }

  if (status === "delivered") {
    return (
      <div className="rounded-2xl border border-[var(--color-az-success)]/30 bg-[var(--color-az-success-soft)] p-4 flex items-center gap-3 text-[var(--color-az-success)]">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-semibold">Mission livrée</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {error && (
        <div className="rounded-lg border border-[var(--color-az-danger)]/40 bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)] px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {isPool && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={refuse}
            disabled={busy}
            className="h-12 rounded-full border border-[var(--color-border)] text-sm font-medium"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={claim}
            disabled={busy}
            className="h-12 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold"
          >
            Accepter
          </button>
        </div>
      )}

      {isMine && step && status !== "at_customer" && (
        <button
          type="button"
          onClick={() => advance(step.to)}
          disabled={busy}
          className={cn(
            "w-full h-12 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold",
            busy && "opacity-60",
          )}
        >
          {step.label}
        </button>
      )}

      {showOtp && (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">Code de livraison</div>
            <p className="text-sm">Demandez au client son code à 4 chiffres pour confirmer la livraison.</p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={4}
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
            placeholder="1234"
            className="w-full h-14 text-center text-2xl tracking-[0.6em] font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
          />
          <button
            type="button"
            onClick={deliver}
            disabled={busy || otpInput.length !== 4}
            className="w-full h-12 rounded-full bg-[var(--color-az-success)] text-white text-sm font-semibold disabled:opacity-60"
          >
            Valider la livraison
          </button>
          {otp && (
            <details className="text-[10px] text-[var(--color-foreground-muted)]">
              <summary className="cursor-pointer">DEV : code OTP</summary>
              <code className="mt-1 inline-block px-2 py-0.5 rounded bg-[var(--color-surface-muted)]">
                {otp}
              </code>
              <p className="mt-1">Section masquée en prod — retirer avec un feature flag.</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
