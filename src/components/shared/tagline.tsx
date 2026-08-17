/**
 * "— Qualité · Choix · Prix Justes —" tagline block, styled to match
 * the official logo. Drop-in for footers, splash screens, empty states.
 */
export function Tagline({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <div className={`inline-flex items-center gap-2 ${cls} font-medium tracking-widest uppercase`}>
      <span className="h-px w-6 bg-[var(--color-az-green-700)]" />
      <span>Qualité</span>
      <span className="w-1 h-1 rounded-full bg-[var(--color-az-red-500)]" />
      <span>Choix</span>
      <span className="w-1 h-1 rounded-full bg-[var(--color-az-red-500)]" />
      <span>Prix Justes</span>
      <span className="h-px w-6 bg-[var(--color-az-green-700)]" />
    </div>
  );
}
