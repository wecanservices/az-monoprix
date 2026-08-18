import Link from "next/link";
import type { StoreProduct } from "@/services/types";
import { PriceTag } from "@/components/shared/price-tag";
import { ProductImage } from "@/components/shared/product-image";
import { AddToCartButton } from "@/components/client/add-to-cart-button";
import { cn } from "@/lib/utils";

/**
 * Product card — deux variantes :
 *  - `grid`  (default) : grille mobile 2 colonnes, room pour prix + CTA
 *  - `wide`            : item de carousel horizontal, largeur fixe
 *
 * Touches premium : rounded 2xl, image inset arrondie avec inner shadow,
 * badge néo-morphique top-right, CTA floating bas-droit avec glow,
 * hover lift + image scale (desktop uniquement, pas de désastre mobile).
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
  const percent = hasPromo
    ? Math.round(((product.price - product.promo_price!) / product.price) * 100)
    : 0;
  const outOfStock = product.on_hand - product.reserved <= 0;

  return (
    <article
      className={cn(
        "az-product-card az-scale-in relative flex flex-col rounded-[24px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-elev-1)] overflow-hidden",
        isWide ? "w-44 shrink-0" : "w-full",
      )}
    >
      <Link
        href={`/client/product/${product.id}`}
        className="block relative"
        aria-label={product.name_fr}
      >
        {/* Media — inset arrondi, ring intérieur, inner shadow */}
        <div className="relative m-2 mb-0 overflow-hidden rounded-2xl bg-[var(--color-surface-muted)] ring-1 ring-inset ring-[var(--color-border-subtle)]">
          <ProductImage
            productName={product.name_fr}
            sku={product.sku}
            images={product.images}
            className="az-product-card-media aspect-square w-full"
            sizes={isWide ? "176px" : "(max-width: 768px) 45vw, 200px"}
          />

          {/* Out-of-stock overlay — badge léger, pas de blur pour ne pas masquer le placeholder */}
          {outOfStock && (
            <div className="absolute inset-x-0 bottom-0 grid place-items-center p-2 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-az-danger)] bg-[var(--color-surface)]/95 px-2.5 py-1 rounded-full shadow-[var(--shadow-elev-2)] ring-1 ring-[var(--color-border-subtle)]">
                Rupture
              </span>
            </div>
          )}
        </div>

        {/* Badges top-right */}
        {hasPromo && (
          <span className="az-badge-promo absolute top-3.5 right-3.5 z-10">
            −{percent}%
          </span>
        )}
        {product.is_featured && !hasPromo && (
          <span className="az-badge-gold absolute top-3.5 right-3.5 z-10">★ Top</span>
        )}
      </Link>

      {/* Meta */}
      <div className="flex-1 p-3 pt-2.5 pr-14 space-y-1">
        {product.brand?.name && (
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-foreground-subtle)] font-bold truncate">
            {product.brand.name}
          </p>
        )}
        <Link href={`/client/product/${product.id}`}>
          <h3 className="text-[13px] font-semibold leading-tight line-clamp-2 min-h-[2.4em] text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors">
            {product.name_fr}
          </h3>
        </Link>

        <div className="pt-1.5">
          <PriceTag
            price={product.price}
            promoPrice={product.promo_price}
            unit={product.unit}
            size="sm"
          />
        </div>
      </div>

      {/* CTA floating — bas-droit, glow au hover */}
      {!outOfStock && (
        <div className="absolute bottom-3 right-3 z-10">
          <AddToCartButton productId={product.id} />
        </div>
      )}
    </article>
  );
}
