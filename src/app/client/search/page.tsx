import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductCard } from "@/components/client/product-card";
import { createReadServerClient } from "@/lib/supabase/anon-server";
import { listProducts } from "@/services/products";
import { DEFAULT_STORE_ID } from "@/services/stores";
import type { StoreProduct } from "@/services/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  let results: StoreProduct[] = [];
  if (query.length > 1) {
    try {
      results = await listProducts(createReadServerClient(), {
        storeId: DEFAULT_STORE_ID,
        search: query,
        limit: 60,
      });
    } catch {}
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/client/home"
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">Rechercher</h1>
      </div>

      <form className="mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]" />
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Ex : lait, huile, tomate…"
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </form>

      {query.length < 2 ? (
        <EmptyState
          title="Tapez au moins 2 lettres"
          description="Cherchez par nom, marque ou catégorie."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={`Aucun résultat pour « ${query} »`}
          description="Essayez avec d'autres mots-clés."
        />
      ) : (
        <>
          <p className="text-xs text-[var(--color-foreground-muted)] mb-3">
            {results.length} résultat{results.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
