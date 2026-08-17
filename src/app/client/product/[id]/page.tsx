import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { PriceTag } from "@/components/shared/price-tag";
import { ProductImage } from "@/components/shared/product-image";
import { PromoBadge } from "@/components/shared/promo-badge";
import { AddToCartButton } from "@/components/client/add-to-cart-button";
import { ProductCard } from "@/components/client/product-card";
import { SectionHeader } from "@/components/shared/section-header";
import { createReadServerClient } from "@/lib/supabase/anon-server";
import { getProductById, listProducts } from "@/services/products";
import { DEFAULT_STORE_ID } from "@/services/stores";
import type { StoreProduct } from "@/services/types";

export const revalidate = 60;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = createReadServerClient();
  const product = await getProductById(sb, id, DEFAULT_STORE_ID);
  if (!product) notFound();

  let related: StoreProduct[] = [];
  if (product.category_id) {
    try {
      const list = await listProducts(sb, {
        storeId: DEFAULT_STORE_ID,
        categoryId: product.category_id,
        limit: 8,
      });
      related = list.filter((p) => p.id !== product.id).slice(0, 6);
    } catch {}
  }

  const outOfStock = product.on_hand - product.reserved <= 0;
  const hasPromo = product.promo_price != null && product.promo_price < product.price;

  return (
    <main className="pb-32">
      <div className="relative">
        <ProductImage
          src={product.images[0]}
          alt={product.name_fr}
          fallbackEmoji={product.category?.icon}
          className="w-full aspect-square"
          sizes="100vw"
        />
        <Link
          href="/client/home"
          className="absolute top-3 left-3 grid place-items-center w-9 h-9 rounded-full bg-white/95 shadow-[var(--shadow-sm)]"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <button
          type="button"
          className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full bg-white/95 shadow-[var(--shadow-sm)]"
          aria-label="Ajouter aux favoris"
        >
          <Heart className="w-4 h-4" />
        </button>
        {hasPromo && (
          <div className="absolute bottom-3 left-3">
            <PromoBadge>Promo</PromoBadge>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-4">
        {product.brand?.name && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)]">
            {product.brand.name}
          </p>
        )}
        <h1 className="text-2xl font-semibold leading-tight">{product.name_fr}</h1>

        <PriceTag
          price={product.price}
          promoPrice={product.promo_price}
          unit={product.unit}
          size="lg"
        />

        {product.category && (
          <Link
            href={`/client/categories/${product.category.slug}`}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)]"
          >
            <span>{product.category.icon}</span> {product.category.name_fr}
          </Link>
        )}

        {product.description_fr && (
          <div className="pt-2 space-y-1.5">
            <h2 className="text-sm font-semibold">Description</h2>
            <p className="text-sm text-[var(--color-foreground-muted)] leading-relaxed">
              {product.description_fr}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Stat label="Unité" value={product.unit ?? "—"} />
          <Stat
            label="Poids"
            value={
              product.weight_grams
                ? `${(product.weight_grams / 1000).toFixed(product.weight_grams < 1000 ? 2 : 1)} kg`
                : "—"
            }
          />
          <Stat label="SKU" value={product.sku} />
          <Stat
            label="Stock"
            value={
              outOfStock
                ? "Rupture"
                : product.on_hand - product.reserved > 20
                ? "En stock"
                : `Il en reste ${product.on_hand - product.reserved}`
            }
          />
        </div>

        {related.length > 0 && (
          <section className="space-y-3 pt-4">
            <SectionHeader title="Vous aimerez aussi" />
            <div className="grid grid-cols-2 gap-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <PriceTag
              price={product.price}
              promoPrice={product.promo_price}
              size="md"
            />
          </div>
          <div className="w-40">
            {outOfStock ? (
              <button
                disabled
                className="w-full h-10 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)] text-sm font-medium"
              >
                Rupture de stock
              </button>
            ) : (
              <AddToCartButton productId={product.id} compact={false} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
