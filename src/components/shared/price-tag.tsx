import { formatDZD } from "@/utils/money";
import { cn } from "@/lib/utils";

/**
 * Displays a price with optional strikethrough when a promo price is set.
 * Never format prices ad-hoc — always come through PriceTag or Money.
 */
export function PriceTag({
  price,
  promoPrice,
  unit,
  size = "md",
  className,
}: {
  price: number;
  promoPrice?: number | null;
  unit?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const effective = promoPrice ?? price;
  const hasPromo = promoPrice != null && promoPrice < price;
  const percent = hasPromo ? Math.round(((price - promoPrice!) / price) * 100) : 0;

  const cls =
    size === "lg"
      ? "text-2xl font-bold"
      : size === "sm"
      ? "text-sm font-semibold"
      : "text-base font-semibold";

  return (
    <div className={cn("flex flex-wrap items-baseline gap-1.5", className)}>
      <span className={cn(cls, hasPromo && "text-[var(--color-az-promo)]")}>
        {formatDZD(effective)}
      </span>
      {hasPromo && (
        <>
          <span className="text-xs text-[var(--color-foreground-muted)] line-through">
            {formatDZD(price)}
          </span>
          <span className="text-[10px] font-bold uppercase text-[var(--color-az-promo)]">
            -{percent}%
          </span>
        </>
      )}
      {unit && (
        <span className="text-[11px] text-[var(--color-foreground-muted)]">
          / {unit}
        </span>
      )}
    </div>
  );
}
