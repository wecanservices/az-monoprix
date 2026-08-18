import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Supabase Storage (local + prod). Precise host is checked at runtime.
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      { protocol: "https", hostname: "*.supabase.co" },
      // Open Food Facts — photos enrichies via `scripts/enrich-photos.ts`
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "world.openfoodfacts.org" },
      { protocol: "https", hostname: "static.openfoodfacts.org" },
      // Unsplash — photos de catégories & bannières (image_url en DB)
      { protocol: "https", hostname: "images.unsplash.com" },
      // Permission dynamique — camera nécessaire pour le scanner code-barre
      // (surcharge ci-dessus qui met camera=() ferme la caméra)
    ],
  },
  async headers() {
    // Static security headers. CSP is nonce-less here (relies on
    // Next's inline hydration script); switch to nonce-based CSP if
    // you disable inline scripts in a later hardening pass.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  experimental: {
    // typedRoutes: true,  // ré-activer après stabilisation des routes
  },
};

export default withNextIntl(nextConfig);
