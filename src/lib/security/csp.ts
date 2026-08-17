import "server-only";
import { env } from "@/config/env";

/**
 * Build a strict Content-Security-Policy header for production.
 *
 * Kept intentionally tight; extend `connect-src` / `img-src` when
 * plugging in Mapbox, Google Analytics, etc.
 */
export function buildCsp(nonce?: string): string {
  const supabaseHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
  const supabaseWss = supabaseHost.startsWith("127.")
    ? "ws://127.0.0.1:*"
    : `wss://${supabaseHost}`;

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      nonce ? `'nonce-${nonce}'` : "'unsafe-inline'",
      "'strict-dynamic'",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", `https://${supabaseHost}`, `http://${supabaseHost}`],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": [
      "'self'",
      `https://${supabaseHost}`,
      `http://${supabaseHost}`,
      supabaseWss,
    ],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}
