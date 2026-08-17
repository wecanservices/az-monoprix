export function PromoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-az-promo)] text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      {children}
    </span>
  );
}
