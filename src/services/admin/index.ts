import type { SupabaseClient } from "@supabase/supabase-js";

export * from "./products";
export * from "./inventory";

/* ============================================================
   CATEGORIES
   ============================================================ */
export async function adminListCategories(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name_fr, name_ar, name_en, icon, image_url, position, is_active, parent_id")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export interface CategoryInput {
  id?: string;
  slug: string;
  name_fr: string;
  name_ar?: string | null;
  name_en?: string | null;
  icon?: string | null;
  position?: number;
  is_active?: boolean;
  parent_id?: string | null;
}
export async function adminUpsertCategory(
  sb: SupabaseClient,
  input: CategoryInput,
): Promise<string> {
  if (input.id) {
    const { error } = await sb.from("categories").update(input).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await sb.from("categories").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}
export async function adminDeleteCategory(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ============================================================
   BRANDS
   ============================================================ */
export async function adminListBrands(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("brands")
    .select("id, slug, name, logo_url, is_active")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/* ============================================================
   STORES
   ============================================================ */
export async function adminListStores(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("stores")
    .select(
      "id, code, name, address, phone, opens_at, closes_at, prep_capacity, wilaya_code, is_active",
    )
    .order("name");
  if (error) throw error;
  return data ?? [];
}
export interface StoreInput {
  id?: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  wilaya_code?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  prep_capacity?: number;
  is_active?: boolean;
}
export async function adminUpsertStore(sb: SupabaseClient, input: StoreInput): Promise<string> {
  if (input.id) {
    const { error } = await sb.from("stores").update(input).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await sb.from("stores").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

/* ============================================================
   DRIVERS
   ============================================================ */
export async function adminListDrivers(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("drivers")
    .select(
      `id, vehicle_type, vehicle_plate, license_number, status, rating, total_deliveries,
       is_verified, created_at,
       profile:profiles(full_name, email, phone)`,
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminSetDriverVerified(
  sb: SupabaseClient,
  driverId: string,
  isVerified: boolean,
) {
  const { error } = await sb.from("drivers").update({ is_verified: isVerified }).eq("id", driverId);
  if (error) throw error;
}

/**
 * Promote an existing user to a driver — creates the `drivers` row
 * and updates the `profiles.role`. Used from the admin "invite driver"
 * flow: an existing customer accepts a driver invitation.
 */
export async function adminMakeUserDriver(
  sb: SupabaseClient,
  userId: string,
  vehicleType: "motorbike" | "scooter" | "car" | "van" | "bike" | "foot",
) {
  const { error: pErr } = await sb.from("profiles").update({ role: "driver" }).eq("id", userId);
  if (pErr) throw pErr;
  const { error: dErr } = await sb
    .from("drivers")
    .upsert({ id: userId, vehicle_type: vehicleType, is_verified: false });
  if (dErr) throw dErr;
}

/* ============================================================
   CUSTOMERS
   ============================================================ */
export async function adminListCustomers(
  sb: SupabaseClient,
  opts: { search?: string; limit?: number } = {},
) {
  let q = sb
    .from("customers")
    .select(
      `id, loyalty_number, marketing_opt_in, created_at,
       profile:profiles(full_name, email, phone),
       loyalty:loyalty_accounts(balance, lifetime_earned)`,
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  const { data, error } = await q;
  if (error) throw error;
  let rows = data ?? [];
  if (opts.search && opts.search.trim().length > 1) {
    const s = opts.search.toLowerCase();
    rows = rows.filter((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p: any = Array.isArray(c.profile) ? c.profile[0] : c.profile;
      return (
        p?.full_name?.toLowerCase().includes(s) ||
        p?.email?.toLowerCase().includes(s) ||
        p?.phone?.toLowerCase().includes(s)
      );
    });
  }
  return rows;
}

export async function adminGetCustomer(sb: SupabaseClient, id: string) {
  const { data, error } = await sb
    .from("customers")
    .select(
      `id, loyalty_number, marketing_opt_in, date_of_birth, created_at,
       profile:profiles(full_name, email, phone, avatar_url),
       loyalty:loyalty_accounts(balance, lifetime_earned),
       orders(id, order_number, total, status, placed_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
