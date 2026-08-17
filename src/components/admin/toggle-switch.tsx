"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Optimistic switch. `onCommit` is called with the new value; if it
 * throws or returns false, the switch reverts.
 */
export function ToggleSwitch({
  initial,
  onCommit,
  labelOn = "Actif",
  labelOff = "Inactif",
}: {
  initial: boolean;
  onCommit: (next: boolean) => Promise<boolean | void>;
  labelOn?: string;
  labelOff?: string;
}) {
  const [on, setOn] = useState(initial);
  const [busy, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        const res = await onCommit(next);
        if (res === false) setOn(!next);
      } catch {
        setOn(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      className={cn(
        "relative inline-flex items-center h-6 w-11 rounded-full transition",
        on ? "bg-[var(--color-primary)]" : "bg-[var(--color-az-neutral-300)]",
        busy && "opacity-70",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-5" : "translate-x-0.5",
        )}
      />
      <span className="sr-only">{on ? labelOn : labelOff}</span>
    </button>
  );
}
