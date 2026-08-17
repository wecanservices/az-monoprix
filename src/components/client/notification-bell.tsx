"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

interface Notif {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.data.items ?? []);
      setUnread(j.data.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function markAll() {
    await fetch("/api/v1/notifications", { method: "POST" });
    setUnread(0);
    setItems((it) => it.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full hover:bg-[var(--color-surface-muted)] relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-40 w-80 max-w-[90vw] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-[var(--color-primary)] inline-flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tout lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-xs text-[var(--color-foreground-muted)]">Chargement…</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-sm text-[var(--color-foreground-muted)] text-center">
                  Aucune notification.
                </div>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link_url ?? "#"}
                    onClick={() => setOpen(false)}
                    className={
                      "block px-3 py-2.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-muted)] " +
                      (n.read_at ? "" : "bg-[var(--color-primary)]/5")
                    }
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {n.body && <div className="text-xs text-[var(--color-foreground-muted)] line-clamp-2">{n.body}</div>}
                        <div className="text-[10px] text-[var(--color-foreground-muted)] mt-0.5">
                          {new Date(n.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
