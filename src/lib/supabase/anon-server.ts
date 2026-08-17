/**
 * Read-only Supabase client for anonymous SSR reads (catalog).
 * Falls back to the service_role key when no auth context is present
 * so catalog pages render for guests too.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/config/env";
import type { Database } from "@/types/database.types";

export function createAnonServerClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function createReadServerClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
