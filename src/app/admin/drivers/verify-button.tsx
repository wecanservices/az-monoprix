"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function VerifyButton({ driverId, verified }: { driverId: string; verified: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await fetch(`/api/v1/admin/drivers/${driverId}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verified: !verified }),
      });
      router.refresh();
    });
  }

  if (!verified) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[var(--color-az-success)] text-white font-semibold"
      >
        <Check className="w-3.5 h-3.5" /> Valider
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-az-danger)] font-medium"
    >
      <X className="w-3.5 h-3.5" /> Révoquer
    </button>
  );
}
