import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Product image with a graceful emoji fallback when no URL is set.
 * Placeholder art uses the category icon so the grid stays visually
 * balanced even before we upload real product photos.
 */
export function ProductImage({
  src,
  alt,
  fallbackEmoji,
  className,
  sizes,
}: {
  src?: string | null;
  alt: string;
  fallbackEmoji?: string | null;
  className?: string;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-[var(--color-surface-muted)]", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "(max-width: 768px) 50vw, 200px"}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid place-items-center bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-az-neutral-200)] text-4xl",
        className,
      )}
      aria-label={alt}
    >
      <span aria-hidden>{fallbackEmoji ?? "🛒"}</span>
    </div>
  );
}
