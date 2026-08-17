import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { Tagline } from "@/components/shared/tagline";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh grid place-items-center px-4 py-10 az-mesh">
      <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size="lg" />
          <Tagline size="sm" />
        </div>
        {children}
      </div>
    </main>
  );
}
