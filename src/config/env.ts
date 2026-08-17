/**
 * AZ MONOPRIX — Environment variables (validated).
 *
 * Never read `process.env` directly outside this file. Import
 * `env` / `serverEnv` instead — validation happens once at
 * import time so bad configs fail fast at boot.
 */

import { z } from "zod";

/** Public — safe to expose to the browser (NEXT_PUBLIC_*) */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("AZ Monoprix"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["fr", "ar", "en"]).default("fr"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default("DZD"),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: z.string().optional(),
});

/** Server-only — never send to the browser */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  AI_PROVIDER: z.enum(["gemini", "anthropic", "openai"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gemini-2.0-flash"),
  FEATURE_AI_SHOPPING: z.coerce.boolean().default(true),
  FEATURE_AI_ADMIN: z.coerce.boolean().default(true),
  FEATURE_LIVE_TRACKING: z.coerce.boolean().default(true),
});

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, unknown>) {
  const result = schema.safeParse(source);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error("[env] Invalid environment configuration:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. See logs above.");
  }
  return result.data;
}

/** Client-safe env — usable in any file. */
export const env = parse(publicSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
});

/**
 * Server-only env. Import ONLY from server components,
 * route handlers, server actions, and services running server-side.
 */
export const serverEnv =
  typeof window === "undefined"
    ? parse(serverSchema, {
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        AI_PROVIDER: process.env.AI_PROVIDER,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        AI_MODEL: process.env.AI_MODEL,
        FEATURE_AI_SHOPPING: process.env.FEATURE_AI_SHOPPING,
        FEATURE_AI_ADMIN: process.env.FEATURE_AI_ADMIN,
        FEATURE_LIVE_TRACKING: process.env.FEATURE_LIVE_TRACKING,
      })
    : (undefined as unknown as z.infer<typeof serverSchema>);
