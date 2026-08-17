import type { SupabaseClient } from "@supabase/supabase-js";

export interface DispatchCandidate {
  driver_id: string;
  full_name: string | null;
  distance_km: number;
  active_load: number;
  rating: number;
  score: number;
}

/**
 * Rank online drivers for a given order. Backed by the SQL function
 * `available_drivers_for_order` so both the admin UI and any future
 * cron/edge dispatcher return the same ordering.
 */
export async function rankDriversForOrder(
  sb: SupabaseClient,
  orderId: string,
): Promise<DispatchCandidate[]> {
  const { data, error } = await sb.rpc("available_drivers_for_order", {
    p_order_id: orderId,
  });
  if (error) throw error;
  return (data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any): DispatchCandidate => ({
      driver_id: r.driver_id,
      full_name: r.full_name,
      distance_km: Number(r.distance_km),
      active_load: Number(r.active_load),
      rating: Number(r.rating),
      score: Number(r.score),
    }),
  );
}
