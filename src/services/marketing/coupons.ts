import type { SupabaseClient } from "@supabase/supabase-js";

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed_amount" | "buy_x_get_y" | "bundle" | "free_shipping";
  value: number | null;
  min_order: number | null;
  max_redemptions: number | null;
  per_customer_limit: number | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  redemptions_count?: number;
}

export async function adminListCoupons(sb: SupabaseClient): Promise<CouponRow[]> {
  const { data, error } = await sb
    .from("coupons")
    .select(`
      id, code, description, type, value, min_order,
      max_redemptions, per_customer_limit, starts_at, ends_at, is_active,
      redemptions:coupon_redemptions(id)
    `)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((c: any) => ({
    ...c,
    redemptions_count: c.redemptions?.length ?? 0,
  })) as CouponRow[];
}

export interface CouponInput {
  id?: string;
  code: string;
  description?: string | null;
  type: CouponRow["type"];
  value?: number | null;
  min_order?: number | null;
  max_redemptions?: number | null;
  per_customer_limit?: number | null;
  starts_at?: string;
  ends_at?: string | null;
  is_active?: boolean;
}

export async function adminUpsertCoupon(sb: SupabaseClient, input: CouponInput) {
  if (input.id) {
    const { error } = await sb.from("coupons").update(input).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await sb.from("coupons").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

/**
 * Validate a coupon against a customer + order subtotal.
 * Server-side ONLY — never trust the client for the amount applied.
 */
export async function evaluateCoupon(
  sb: SupabaseClient,
  code: string,
  subtotal: number,
  customerId?: string | null,
): Promise<{
  valid: true;
  couponId: string;
  amountOff: number;
  freeShipping: boolean;
} | {
  valid: false;
  reason: string;
}> {
  const { data: coupon } = await sb
    .from("coupons")
    .select("*")
    .ilike("code", code)
    .maybeSingle();

  if (!coupon || !coupon.is_active) return { valid: false, reason: "Code invalide" };

  const now = new Date();
  if (new Date(coupon.starts_at) > now) return { valid: false, reason: "Code non encore actif" };
  if (coupon.ends_at && new Date(coupon.ends_at) < now) return { valid: false, reason: "Code expiré" };
  if (coupon.min_order && subtotal < Number(coupon.min_order)) {
    return { valid: false, reason: `Minimum ${coupon.min_order} DA requis` };
  }

  if (coupon.max_redemptions != null) {
    const { count } = await sb
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);
    if ((count ?? 0) >= coupon.max_redemptions) {
      return { valid: false, reason: "Nombre maximum d'utilisations atteint" };
    }
  }

  if (customerId && coupon.per_customer_limit != null) {
    const { count } = await sb
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("customer_id", customerId);
    if ((count ?? 0) >= coupon.per_customer_limit) {
      return { valid: false, reason: "Vous avez déjà utilisé ce code" };
    }
  }

  let amountOff = 0;
  let freeShipping = false;
  switch (coupon.type as string) {
    case "percentage":
      amountOff = Math.round(subtotal * (Number(coupon.value) / 100));
      break;
    case "fixed_amount":
      amountOff = Math.min(subtotal, Number(coupon.value));
      break;
    case "free_shipping":
      freeShipping = true;
      break;
    default:
      amountOff = 0;
  }

  return { valid: true, couponId: coupon.id, amountOff, freeShipping };
}
