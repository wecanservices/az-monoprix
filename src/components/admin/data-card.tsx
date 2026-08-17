import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Base surface used across admin tables & panels. */
export function DataCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}
