import Link from "next/link";
import { MapPin, Search, ScanLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shared/logo";
import { NotificationBell } from "@/components/client/notification-bell";

export async function ClientHeader({ location }: { location?: string }) {
  const t = await getTranslations("client.home");

  return (
    <header className="sticky top-0 z-20 az-glass border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-2 flex items-center justify-between gap-3">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <NotificationBell />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-2 flex items-center gap-1.5 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-az-red-50)] text-[var(--color-az-red-700)] px-2 py-1 font-semibold">
          <MapPin className="w-3 h-3" />
          {location ?? "Lakhdaria, Bouira"}
        </span>
        <span className="text-[var(--color-foreground-muted)]">·</span>
        <span className="text-[var(--color-foreground-muted)]">Livraison en 2h</span>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-3 flex items-center gap-2">
        <Link
          href="/client/search"
          className="flex-1 flex items-center gap-2 h-11 px-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-foreground-muted)] shadow-[var(--shadow-xs)] hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-sm)] transition-all"
        >
          <Search className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="flex-1">{t("searchPlaceholder")}</span>
          <kbd className="hidden sm:inline text-[10px] text-[var(--color-foreground-muted)] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border)]">⌘K</kbd>
        </Link>
        <Link
          href="/client/scan"
          aria-label="Scanner un code-barre"
          className="shrink-0 w-11 h-11 rounded-2xl bg-[var(--color-primary)] text-white grid place-items-center shadow-[var(--shadow-sm)] hover:brightness-105 active:scale-95 transition"
        >
          <ScanLine className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
