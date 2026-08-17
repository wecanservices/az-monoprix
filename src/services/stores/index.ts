import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "@/services/types";

/** ID par défaut du magasin AZ Bab Ezzouar (seed dev). */
export const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000001";

export async function listStores(sb: SupabaseClient): Promise<Store[]> {
  const { data, error } = await sb
    .from("stores")
    .select("id, code, name, address, phone, opens_at, closes_at")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Store[];
}

export async function getDefaultStore(sb: SupabaseClient): Promise<Store | null> {
  const { data } = await sb
    .from("stores")
    .select("id, code, name, address, phone, opens_at, closes_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Store | null) ?? null;
}
