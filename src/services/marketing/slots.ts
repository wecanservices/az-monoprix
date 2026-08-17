import type { SupabaseClient } from "@supabase/supabase-js";

export interface SlotRow {
  id: string;
  store_id: string;
  day_of_week: number | null;
  slot_date: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  mode: "delivery" | "drive" | "pickup";
  is_active: boolean;
}

export async function adminListSlots(
  sb: SupabaseClient,
  storeId: string,
): Promise<SlotRow[]> {
  const { data, error } = await sb
    .from("store_slots")
    .select("id, store_id, day_of_week, slot_date, starts_at, ends_at, capacity, mode, is_active")
    .eq("store_id", storeId)
    .order("day_of_week", { nullsFirst: false })
    .order("starts_at");
  if (error) throw error;
  return (data ?? []) as SlotRow[];
}

export interface SlotInput {
  id?: string;
  store_id: string;
  day_of_week?: number | null;
  slot_date?: string | null;
  starts_at: string;
  ends_at: string;
  capacity?: number;
  mode?: "delivery" | "drive" | "pickup";
  is_active?: boolean;
}

export async function adminUpsertSlot(sb: SupabaseClient, input: SlotInput) {
  if (input.id) {
    const { error } = await sb.from("store_slots").update(input).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await sb.from("store_slots").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function adminDeleteSlot(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("store_slots").delete().eq("id", id);
  if (error) throw error;
}
