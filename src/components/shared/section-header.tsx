import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  title,
  href,
  eyebrow,
  linkLabel = "Voir tout",
}: {
  title: string;
  href?: string;
  eyebrow?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)] mb-1 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-[var(--color-primary)]" />
            {eyebrow}
          </div>
        )}
        <h2 className="text-[19px] font-bold tracking-tight leading-tight text-[var(--color-foreground)]">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-0.5 shrink-0 text-xs font-semibold text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          {linkLabel}
          <ChevronRight className="w-3.5 h-3.5 motion-safe:transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
