import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductCard } from "@/components/client/product-card";
import { createReadServerClient } from "@/lib/supabase/anon-server";
import { getCategoryBySlug, listProducts } from "@/services/products";
import { DEFAULT_STORE_ID } from "@/services/stores";
import type { StoreProduct } from "@/services/types";

export const revalidate = 60;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = createReadServerClient();
  const category = await getCategoryBySlug(sb, slug);
  if (!category) notFound();

  let products: StoreProduct[] = [];
  try {
    products = await listProducts(sb, {
      storeId: DEFAULT_STORE_ID,
      categoryId: category.id,
      limit: 60,
    });
  } catch {}

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/client/categories"
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            {category.name_fr}
          </h1>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {products.length} produit{products.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState title="Aucun produit dans cette catégorie" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
