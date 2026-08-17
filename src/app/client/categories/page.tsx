import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ClientHeader } from "@/components/client/client-header";
import { EmptyState } from "@/components/shared/empty-state";
import { createReadServerClient } from "@/lib/supabase/anon-server";
import { listCategories } from "@/services/products";
import type { Category } from "@/services/types";

export const revalidate = 300;

export default async function CategoriesPage() {
  let categories: Category[] = [];
  try {
    categories = await listCategories(createReadServerClient());
  } catch {}

  return (
    <>
      <ClientHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
        <h1 className="text-xl font-semibold mb-4">Catégories</h1>
        {categories.length === 0 ? (
          <EmptyState title="Aucune catégorie" />
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/client/categories/${c.slug}`}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition"
                >
                  <span className="text-3xl">{c.icon ?? "🛒"}</span>
                  <span className="flex-1 font-medium text-sm">{c.name_fr}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-foreground-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
