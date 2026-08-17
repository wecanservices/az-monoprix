"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * ONLINE/OFFLINE switch — top-bar of the driver shell.
 * Optimistic + revertible on error.
 */
export function OnlineToggle({ initial }: { initial: "online" | "offline" }) {
  const [status, setStatus] = useState<"online" | "offline">(initial);
  const [, startTransition] = useTransition();
  const online = status === "online";

  function toggle() {
    const next = online ? "offline" : "online";
    setStatus(next);
    startTransition(async () => {
      try {
        await fetch("/api/v1/driver/location", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
      } catch {
        setStatus(online ? "online" : "offline");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition",
        online
          ? "bg-[var(--color-az-success)]/10 text-[var(--color-az-success)]"
          : "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]",
      )}
      aria-pressed={online}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          online ? "bg-[var(--color-az-success)]" : "bg-[var(--color-foreground-muted)]",
        )}
      />
      {online ? "En ligne" : "Hors ligne"}
    </button>
  );
}
