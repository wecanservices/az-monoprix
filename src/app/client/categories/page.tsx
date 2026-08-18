import Link from "next/link";
import Image from "next/image";
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
        <div className="mb-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)] flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />
            Nos rayons
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-0.5">Explorez le magasin</h1>
        </div>

        {categories.length === 0 ? (
          <EmptyState title="Aucune catégorie" />
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/client/categories/${c.slug}`}
                  className="group block relative overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-border-subtle)] shadow-[var(--shadow-elev-1)] motion-safe:transition-all motion-safe:duration-[var(--duration-base)] motion-safe:ease-[var(--ease-out-back)] hover:shadow-[var(--shadow-elev-3)] hover:-translate-y-1 hover:ring-[var(--color-primary)]/40"
                >
                  {/* Image (Unsplash) ou SVG local */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-muted)]">
                    {c.image_url ? (
                      <Image
                        src={c.image_url}
                        alt={c.name_fr}
                        fill
                        sizes="(max-width: 768px) 45vw, 200px"
                        className="object-cover motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-out-expo)] group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-5xl">
                        {c.icon ?? "🛒"}
                      </div>
                    )}
                    {/* Overlay gradient bas pour lisibilité */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Label + chevron */}
                  <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
                    <span className="text-sm font-black text-white drop-shadow-md leading-tight">
                      {c.name_fr}
                    </span>
                    <span className="grid place-items-center w-7 h-7 rounded-full bg-white/95 text-[var(--color-primary)] shadow-[var(--shadow-elev-1)] shrink-0 group-hover:bg-[var(--color-primary)] group-hover:text-white motion-safe:transition-colors">
                      <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
