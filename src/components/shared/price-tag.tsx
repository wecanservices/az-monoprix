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

  const priceCls =
    size === "lg"
      ? "text-[26px] font-black leading-none"
      : size === "sm"
      ? "text-[15px] font-black leading-none"
      : "text-[18px] font-black leading-none";

  const oldCls =
    size === "lg"
      ? "text-sm"
      : size === "sm"
      ? "text-[11px]"
      : "text-xs";

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            priceCls,
            "tabular-nums tracking-tight",
            hasPromo
              ? "text-[var(--color-az-promo)]"
              : "text-[var(--color-foreground)]",
          )}
        >
          {formatDZD(effective)}
        </span>
      </div>
      {hasPromo && (
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              oldCls,
              "text-[var(--color-foreground-subtle)] line-through decoration-[var(--color-foreground-subtle)]/60 tabular-nums",
            )}
          >
            {formatDZD(price)}
          </span>
          {unit && (
            <span className="text-[10px] text-[var(--color-foreground-subtle)]">
              / {unit}
            </span>
          )}
        </div>
      )}
      {!hasPromo && unit && (
        <span className="text-[10px] text-[var(--color-foreground-subtle)]">
          / {unit}
        </span>
      )}
    </div>
  );
}
