import type { ReactNode } from "react";
import Link from "next/link";
import { requireDriver } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/shared/logo";
import { OnlineToggle } from "@/components/driver/online-toggle";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const session = await requireDriver();
  const sb = await createClient();
  const { data: driver } = await sb
    .from("drivers")
    .select("status")
    .eq("id", session.id)
    .maybeSingle();
  const status = (driver?.status ?? "offline") as "online" | "offline";

  return (
    <div className="min-h-svh flex flex-col">
      <header className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <OnlineToggle initial={status} />
          </div>
        </div>
        <nav className="mx-auto max-w-2xl px-2 pb-2 flex gap-1 text-sm overflow-x-auto no-scrollbar">
          {[
            ["/driver/dashboard", "Accueil"],
            ["/driver/orders", "Missions"],
            ["/driver/history", "Historique"],
            ["/driver/wallet", "Portefeuille"],
            ["/driver/profile", "Profil"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 px-3 py-1.5 rounded-full text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)]"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-4">
        {children}
      </main>
    </div>
  );
}
