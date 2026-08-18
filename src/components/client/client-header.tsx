import Link from "next/link";
import { MapPin, Search, ScanLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shared/logo";
import { NotificationBell } from "@/components/client/notification-bell";

export async function ClientHeader({ location }: { location?: string }) {
  const t = await getTranslations("client.home");

  return (
    <header className="sticky top-0 z-20 az-glass-strong border-b border-[var(--color-border-subtle)]">
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-2 flex items-center justify-between gap-3">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <NotificationBell />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-2.5 flex items-center gap-2 text-xs">
        <span className="az-location-chip">
          <MapPin className="w-3 h-3" strokeWidth={2.4} />
          {location ?? "Lakhdaria, Bouira"}
        </span>
        <span className="text-[var(--color-foreground-subtle)]">·</span>
        <span className="text-[var(--color-foreground-muted)] font-medium">
          Livraison en 2h
        </span>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-3 flex items-center gap-2">
        <Link
          href="/client/search"
          className="az-search-bar flex-1 group"
        >
          <Search className="w-4 h-4 text-[var(--color-primary)] shrink-0" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[var(--color-foreground-muted)] group-hover:text-[var(--color-foreground)] transition-colors">
            {t("searchPlaceholder")}
          </span>
          <kbd className="hidden sm:inline text-[10px] text-[var(--color-foreground-muted)] font-mono px-1.5 py-0.5 rounded-md bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
            ⌘K
          </kbd>
        </Link>
        <Link
          href="/client/scan"
          aria-label="Scanner un code-barre"
          className="az-btn-icon-primary shrink-0 h-12 w-12"
        >
          <ScanLine className="w-5 h-5" strokeWidth={2.2} />
        </Link>
      </div>
    </header>
  );
}
