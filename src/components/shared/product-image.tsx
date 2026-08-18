import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * ProductImage — affiche la photo produit ou un placeholder premium.
 *
 *   1. `images[0]` (ou `src` en fallback compat) : rendu via `next/image`
 *   2. sinon : gradient pastel déterministe (hash du sku) + grande
 *      initiale sérif italique et 2 premiers mots du nom en sous-titre.
 *
 * Jamais de spinner gris — le placeholder doit rester une carte lisible
 * et esthétique. Les couleurs viennent des tokens `--color-placeholder-*`
 * de `globals.css`.
 */

// 12 palettes premium (référence à globals.css : --color-placeholder-{n}-*)
const PALETTE_COUNT = 12;

// Hash déterministe (djb2, tronqué) — stable entre visites.
function hashKey(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i);
  }
  return Math.abs(h);
}

function pickPalette(seed: string): number {
  return (hashKey(seed) % PALETTE_COUNT) + 1;
}

// Ignore les préfixes type "(Pack)" ou "[Promo]" pour extraire un vrai début de nom.
function stripPrefix(name: string): string {
  return name.trim().replace(/^[([{][^)\]}]*[)\]}]\s*/, "").trim();
}

function initialOf(name: string): string {
  const cleaned = stripPrefix(name) || name.trim();
  return (cleaned[0] ?? "?").toUpperCase();
}

function shortLabel(name: string): string {
  const cleaned = stripPrefix(name) || name.trim();
  const words = cleaned.split(/\s+/).slice(0, 2).join(" ");
  return words.length > 22 ? words.slice(0, 20) + "…" : words;
}

export type ProductImageProps = {
  productName: string;
  sku?: string | null;
  images?: (string | null | undefined)[] | null;
  /** Compat : ancien prop `src`. Prend le pas si fourni. */
  src?: string | null;
  /** Compat : conservé pour ne pas casser les appelants existants. */
  alt?: string;
  /** Compat : ignoré si placeholder premium activé. */
  fallbackEmoji?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function ProductImage({
  productName,
  sku,
  images,
  src,
  alt,
  className,
  sizes,
  priority,
}: ProductImageProps) {
  const url =
    src ??
    images?.find((u): u is string => typeof u === "string" && u.length > 0) ??
    null;
  const label = alt ?? productName;

  if (url) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-[var(--color-surface-muted)]",
          className,
        )}
      >
        <Image
          src={url}
          alt={label}
          fill
          sizes={sizes ?? "(max-width: 768px) 50vw, 200px"}
          className="object-cover"
          priority={priority}
          unoptimized
        />
      </div>
    );
  }

  // ── Placeholder premium ──────────────────────────────────────
  const seed = sku ?? productName;
  const palette = pickPalette(seed);
  const initial = initialOf(productName);
  const sub = shortLabel(productName);

  // SVG viewbox 100×100 : la lettre se met à l'échelle exacte de la tuile,
  // que ce soit une vignette 56px ou une image plein écran.
  const gradId = `pg-${palette}`;
  const from = `var(--color-placeholder-${palette}-from)`;
  const to = `var(--color-placeholder-${palette}-to)`;
  const ink = `var(--color-placeholder-${palette}-ink)`;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative overflow-hidden select-none",
        "ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>

        {/* Fond dégradé */}
        <rect width="100" height="100" fill={`url(#${gradId})`} />

        {/* Initiale sérif italique — grande, lisible, en couleur ink */}
        <text
          x="50"
          y={sub ? 55 : 60}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={ink}
          fontFamily='Georgia, "Times New Roman", "PT Serif", serif'
          fontStyle="italic"
          fontWeight="700"
          fontSize="58"
          opacity="0.92"
          style={{ letterSpacing: "-0.04em" }}
        >
          {initial}
        </text>

        {/* Sous-titre (2 premiers mots) */}
        {sub && (
          <text
            x="50"
            y="86"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={ink}
            fontFamily='ui-sans-serif, system-ui, sans-serif'
            fontWeight="700"
            fontSize="6.5"
            opacity="0.75"
            style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
          >
            {sub}
          </text>
        )}
      </svg>
    </div>
  );
}
