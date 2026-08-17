import type { ReactNode } from "react";
import { ClientBottomNav } from "@/components/client/bottom-nav";

/**
 * Client shell — mobile-first.
 * Full-width, sticky top header (rendered per page), sticky bottom nav.
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col">
      <div className="flex-1">{children}</div>
      <ClientBottomNav />
    </div>
  );
}
