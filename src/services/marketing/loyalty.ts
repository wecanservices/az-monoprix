import type { SupabaseClient } from "@supabase/supabase-js";

export interface LoyaltyConfig {
  points_per_dzd: number;
  dzd_per_point: number;
  min_redeem_points: number;
}

export async function getLoyaltyConfig(sb: SupabaseClient): Promise<LoyaltyConfig> {
  const { data } = await sb
    .from("loyalty_config")
    .select("points_per_dzd, dzd_per_point, min_redeem_points")
    .eq("id", true)
    .maybeSingle();
  return {
    points_per_dzd: Number(data?.points_per_dzd ?? 1),
    dzd_per_point: Number(data?.dzd_per_point ?? 1),
    min_redeem_points: Number(data?.min_redeem_points ?? 100),
  };
}

export async function updateLoyaltyConfig(
  sb: SupabaseClient,
  cfg: LoyaltyConfig,
) {
  const { error } = await sb
    .from("loyalty_config")
    .upsert({
      id: true,
      points_per_dzd: cfg.points_per_dzd,
      dzd_per_point: cfg.dzd_per_point,
      min_redeem_points: cfg.min_redeem_points,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function getCustomerLoyalty(sb: SupabaseClient, customerId: string) {
  const [{ data: account }, { data: txns }] = await Promise.all([
    sb.from("loyalty_accounts")
      .select("balance, lifetime_earned")
      .eq("customer_id", customerId)
      .maybeSingle(),
    sb.from("loyalty_transactions")
      .select("id, points, reason, created_at, order:orders(order_number)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return {
    balance: account?.balance ?? 0,
    lifetime_earned: account?.lifetime_earned ?? 0,
    transactions: txns ?? [],
  };
}
