import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/services/types";

/** Maps a category slug to its dedicated SVG illustration if present. */
const CATEGORY_ILLUSTRATIONS = new Set([
  "fruits-legumes", "viandes", "poissons", "laitiers",
  "epicerie", "boissons", "confiserie", "surgeles",
  "hygiene", "maison", "bebe", "animalerie",
]);

export function CategoryChip({ category }: { category: Category }) {
  const hasIllustration = CATEGORY_ILLUSTRATIONS.has(category.slug);

  return (
    <Link
      href={`/client/categories/${category.slug}`}
      className="group flex flex-col items-center gap-2 w-20 text-center"
    >
      <span className="relative grid place-items-center w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-xs)] overflow-hidden transition-all duration-[var(--duration-base)] group-hover:shadow-[var(--shadow-md)] group-hover:-translate-y-0.5 group-hover:border-[var(--color-primary)]/40">
        {hasIllustration ? (
          <Image
            src={`/categories/${category.slug}.svg`}
            alt={category.name_fr}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl">{category.icon ?? "🛒"}</span>
        )}
      </span>
      <span className="text-[11px] font-medium leading-tight line-clamp-2 transition-colors group-hover:text-[var(--color-primary)]">
        {category.name_fr}
      </span>
    </Link>
  );
}
