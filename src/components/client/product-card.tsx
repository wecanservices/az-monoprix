import Link from "next/link";
import type { StoreProduct } from "@/services/types";
import { PriceTag } from "@/components/shared/price-tag";
import { ProductImage } from "@/components/shared/product-image";
import { AddToCartButton } from "@/components/client/add-to-cart-button";
import { cn } from "@/lib/utils";

/**
 * Product card — two variants:
 *  - `grid`  (default) : 2-col mobile layout, taller card with room for CTA
 *  - `wide`            : horizontal carousel item, fixed width
 * Premium touches: subtle border, hover lift, promo ribbon, unit hint.
 */
export function ProductCard({
  product,
  variant = "grid",
}: {
  product: StoreProduct;
  variant?: "grid" | "wide";
}) {
  const isWide = variant === "wide";
  const hasPromo = product.promo_price != null && product.promo_price < product.price;
  const percent = hasPromo ? Math.round(((product.price - product.promo_price!) / product.price) * 100) : 0;
  const outOfStock = product.on_hand - product.reserved <= 0;

  return (
    <article
      className={cn(
        "az-product-card az-scale-in relative rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden",
        isWide ? "w-44 shrink-0" : "w-full",
      )}
    >
      <Link
        href={`/client/product/${product.id}`}
        className="block relative"
        aria-label={product.name_fr}
      >
        <ProductImage
          src={product.images[0]}
          alt={product.name_fr}
          fallbackEmoji={product.category?.icon}
          className="aspect-square w-full"
          sizes={isWide ? "176px" : "(max-width: 768px) 45vw, 200px"}
        />

        {/* Promo ribbon (top-left, angled) */}
        {hasPromo && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-az-promo)] text-white px-2 py-0.5 text-[10px] font-black tracking-tight shadow-[var(--shadow-sm)]">
              -{percent}%
            </span>
          </div>
        )}

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-[var(--color-surface)]/70 backdrop-blur-sm">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-az-danger)] bg-white px-3 py-1.5 rounded-full shadow-[var(--shadow-sm)]">
              Rupture
            </span>
          </div>
        )}

        {/* Featured shine — decorative */}
        {product.is_featured && !hasPromo && (
          <div className="absolute top-2.5 right-2.5">
            <span className="az-badge-gold">★ Top</span>
          </div>
        )}
      </Link>

      <div className="p-2.5 space-y-1.5">
        {product.brand?.name && (
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-foreground-muted)] font-semibold truncate">
            {product.brand.name}
          </p>
        )}
        <Link href={`/client/product/${product.id}`}>
          <h3 className="text-[13px] font-medium leading-tight line-clamp-2 min-h-[2.4em] hover:text-[var(--color-primary)] transition-colors">
            {product.name_fr}
          </h3>
        </Link>
        <div className="flex items-end justify-between gap-2 pt-1">
          <PriceTag
            price={product.price}
            promoPrice={product.promo_price}
            unit={product.unit}
            size="sm"
          />
          {!outOfStock && <AddToCartButton productId={product.id} />}
        </div>
      </div>
    </article>
  );
}
