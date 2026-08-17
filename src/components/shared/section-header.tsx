import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  title,
  href,
  eyebrow,
}: {
  title: string;
  href?: string;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        {eyebrow && (
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-primary)] mb-0.5">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          Voir tout
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
