"use client";

import { useEffect, useState } from "react";

/**
 * Live count of cart items. Fetches once on mount + on window `focus`.
 * Kept simple — Phase 3 will replace this with a shared context.
 */
export function CartBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/v1/cart", { cache: "no-store" });
        const j = await r.json();
        if (alive) setCount(j?.data?.totals?.item_count ?? 0);
      } catch {
        if (alive) setCount(0);
      }
    }
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 grid place-items-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
