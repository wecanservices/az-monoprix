/**
 * Admin Supabase client (service_role).
 * ⚠️  NEVER import from client-facing code — bypasses RLS.
 *
 * Use only for:
 *   - Cron jobs / Edge Functions
 *   - Trusted server-only operations (dispatch, aggregations)
 *   - Seeding / migrations
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import { serverEnv } from "@/config/env";
import type { Database } from "@/types/database.types";

export function createAdminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
