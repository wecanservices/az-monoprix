import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminSidebar } from "@/components/admin/sidebar";

/**
 * Admin shell — desktop-first with sidebar + topbar.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-svh flex bg-[var(--color-surface-muted)]">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-4 gap-3">
          <div className="flex-1" />
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {session.full_name ?? session.email}
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] grid place-items-center text-xs font-semibold">
            {(session.full_name ?? session.email ?? "?")
              .slice(0, 1)
              .toUpperCase()}
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
