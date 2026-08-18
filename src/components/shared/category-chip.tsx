import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/services/types";

/**
 * CategoryChip — pastille circulaire de catégorie.
 *
 * Ordre de préférence pour l'image :
 *   1. `category.image_url` (photo réelle stockée en DB, ex : Unsplash HD)
 *   2. `/categories/{slug}.svg` (illustration locale par défaut)
 *   3. emoji `category.icon` (fallback ultime)
 */
const CATEGORY_ILLUSTRATIONS = new Set([
  "fruits-legumes", "viandes", "poissons", "laitiers",
  "epicerie", "boissons", "confiserie", "surgeles",
  "hygiene", "maison", "bebe", "animalerie",
]);

export function CategoryChip({ category }: { category: Category }) {
  const remote = category.image_url ?? null;
  const localSvg = CATEGORY_ILLUSTRATIONS.has(category.slug)
    ? `/categories/${category.slug}.svg`
    : null;
  const imgSrc = remote ?? localSvg;

  return (
    <Link
      href={`/client/categories/${category.slug}`}
      className="group flex flex-col items-center gap-2 w-20 text-center"
    >
      <span
        className="
          relative grid place-items-center
          w-[68px] h-[68px] rounded-[20px]
          bg-[var(--color-surface)]
          ring-1 ring-inset ring-[var(--color-border-subtle)]
          shadow-[var(--shadow-elev-1)]
          overflow-hidden
          motion-safe:transition-all motion-safe:duration-[var(--duration-base)]
          motion-safe:ease-[var(--ease-out-back)]
          group-hover:shadow-[var(--shadow-elev-3)]
          group-hover:-translate-y-1
          group-hover:ring-[var(--color-primary)]/40
        "
      >
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={category.name_fr}
            fill
            sizes="68px"
            className="object-cover motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-out-expo)] group-hover:scale-110"
          />
        ) : (
          <span className="text-3xl motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-out-back)] group-hover:scale-110">
            {category.icon ?? "🛒"}
          </span>
        )}
      </span>
      <span className="text-[11px] font-semibold leading-tight line-clamp-2 text-[var(--color-foreground)] motion-safe:transition-colors group-hover:text-[var(--color-primary)]">
        {category.name_fr}
      </span>
    </Link>
  );
}
