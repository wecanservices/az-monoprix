import type { SupabaseClient } from "@supabase/supabase-js";
import { canTransition, DRIVER_ACTIVE_STATUSES } from "./state-machine";
import type { OrderStatus } from "@/constants/order-status";

export interface MissionSummary {
  order_id: string;
  order_number: string;
  status: OrderStatus;
  store_name: string;
  store_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  address_snapshot: Record<string, unknown> | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total: number;
  delivery_fee: number;
  distance_km: number | null;
  otp_code?: string | null;
}

/**
 * Missions currently assigned to (or in-flight with) this driver.
 * Also returns the OTP so the driver can double-check on the phone.
 */
export async function listDriverMissions(
  sb: SupabaseClient,
  driverId: string,
): Promise<MissionSummary[]> {
  const { data, error } = await sb
    .from("deliveries")
    .select(
      `
      order_id, otp_code, distance_km,
      order:orders!inner(
        id, order_number, status, total, delivery_fee,
        scheduled_start, scheduled_end, address_snapshot,
        store:stores(name, address),
        customer:customers(id,
          profile:profiles(full_name, phone)
        )
      )
    `,
    )
    .eq("driver_id", driverId)
    .is("delivered_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).flatMap((row): MissionSummary[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o: any = Array.isArray(row.order) ? row.order[0] : row.order;
    if (!o) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store: any = Array.isArray(o.store) ? o.store[0] : o.store;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust: any = Array.isArray(o.customer) ? o.customer[0] : o.customer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prof: any = Array.isArray(cust?.profile) ? cust?.profile?.[0] : cust?.profile;
    return [{
      order_id: o.id,
      order_number: o.order_number,
      status: o.status,
      store_name: store?.name ?? "",
      store_address: store?.address ?? null,
      customer_name: prof?.full_name ?? null,
      customer_phone: prof?.phone ?? null,
      address_snapshot: o.address_snapshot ?? null,
      scheduled_start: o.scheduled_start,
      scheduled_end: o.scheduled_end,
      total: Number(o.total),
      delivery_fee: Number(o.delivery_fee),
      distance_km: row.distance_km != null ? Number(row.distance_km) : null,
      otp_code: row.otp_code,
    }];
  });
}

/**
 * Missions that are `ready` and unassigned — available for pickup by
 * any online driver within range of the store. In Phase 3 we don't
 * filter by driver zone yet; the admin can also assign directly.
 */
export async function listAvailableMissions(
  sb: SupabaseClient,
): Promise<MissionSummary[]> {
  const { data, error } = await sb
    .from("orders")
    .select(
      `
      id, order_number, status, total, delivery_fee,
      scheduled_start, scheduled_end, address_snapshot,
      store:stores(name, address),
      customer:customers(profile:profiles(full_name, phone))
    `,
    )
    .eq("status", "ready")
    .order("scheduled_start", { ascending: true })
    .limit(20);
  if (error) throw error;

  return (data ?? []).map((o) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store: any = Array.isArray(o.store) ? o.store[0] : o.store;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust: any = Array.isArray(o.customer) ? o.customer[0] : o.customer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prof: any = Array.isArray(cust?.profile) ? cust?.profile?.[0] : cust?.profile;
    return {
      order_id: o.id,
      order_number: o.order_number,
      status: o.status,
      store_name: store?.name ?? "",
      store_address: store?.address ?? null,
      customer_name: prof?.full_name ?? null,
      customer_phone: prof?.phone ?? null,
      address_snapshot: o.address_snapshot ?? null,
      scheduled_start: o.scheduled_start,
      scheduled_end: o.scheduled_end,
      total: Number(o.total),
      delivery_fee: Number(o.delivery_fee),
      distance_km: null,
    };
  });
}

/** Assign an order to a driver (admin action or driver self-claim). */
export async function assignDriver(
  sb: SupabaseClient,
  orderId: string,
  driverId: string,
): Promise<void> {
  const { error: upErr } = await sb
    .from("deliveries")
    .upsert(
      { order_id: orderId, driver_id: driverId, assigned_at: new Date().toISOString() },
      { onConflict: "order_id" },
    );
  if (upErr) throw upErr;

  await sb.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to: "assigned",
    p_actor: driverId,
    p_reason: "Driver assigned",
  });
}

/** Driver accepts the mission. */
export async function acceptMission(
  sb: SupabaseClient,
  orderId: string,
  driverId: string,
): Promise<void> {
  await sb
    .from("deliveries")
    .update({ accepted_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("driver_id", driverId);

  await sb.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to: "accepted",
    p_actor: driverId,
  });
}

/** Driver refuses → return to the pool. */
export async function refuseMission(
  sb: SupabaseClient,
  orderId: string,
  driverId: string,
): Promise<void> {
  await sb
    .from("deliveries")
    .update({ driver_id: null, assigned_at: null, accepted_at: null })
    .eq("order_id", orderId)
    .eq("driver_id", driverId);

  await sb.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to: "ready",
    p_actor: driverId,
    p_reason: "Driver refused",
  });
}

/**
 * Advance a driver-owned mission by one step. Every transition goes
 * through `canTransition` so an out-of-band client cannot skip states.
 */
export async function advanceMission(
  sb: SupabaseClient,
  orderId: string,
  driverId: string,
  to: OrderStatus,
): Promise<void> {
  const { data: order, error } = await sb
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error("Order not found");

  if (!canTransition(order.status, to, "driver")) {
    throw new Error(`Transition ${order.status} → ${to} not allowed`);
  }

  const { data: delivery } = await sb
    .from("deliveries")
    .select("driver_id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (delivery?.driver_id !== driverId) throw new Error("Not your mission");

  const patch: Record<string, string> = {};
  if (to === "picked_up") patch.picked_up_at = new Date().toISOString();
  if (Object.keys(patch).length > 0) {
    await sb.from("deliveries").update(patch).eq("order_id", orderId);
  }

  await sb.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to: to,
    p_actor: driverId,
  });
}

/**
 * Verify OTP and finalize delivery. Only marks `delivered` when the
 * code matches.
 */
export async function completeDelivery(
  sb: SupabaseClient,
  orderId: string,
  driverId: string,
  otp: string,
  photoUrl?: string | null,
): Promise<void> {
  const { data: delivery } = await sb
    .from("deliveries")
    .select("id, driver_id, otp_code")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!delivery || delivery.driver_id !== driverId) throw new Error("Not your mission");
  if ((delivery.otp_code ?? "") !== otp) throw new Error("OTP incorrect");

  await sb.from("delivery_proofs").insert({
    delivery_id: delivery.id,
    otp_verified: true,
    photo_url: photoUrl ?? null,
  });

  await sb
    .from("deliveries")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", delivery.id);

  await sb.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to: "delivered",
    p_actor: driverId,
  });

  // Finalize inventory: turn RESERVE into PICK (sold) for each line.
  const { data: items } = await sb
    .from("order_items")
    .select("product_id, quantity, is_available")
    .eq("order_id", orderId);
  const rows = (items ?? []).filter((i) => i.is_available !== false);
  if (rows.length) {
    const { data: order } = await sb
      .from("orders")
      .select("store_id")
      .eq("id", orderId)
      .single();
    if (order) {
      await sb.from("inventory_movements").insert(
        rows.map((i) => ({
          store_id: order.store_id,
          product_id: i.product_id,
          type: "pick" as const,
          quantity: i.quantity,
          reference_id: orderId,
          reference_type: "order",
          reason: "Delivered",
        })),
      );
    }
  }
}

/** Push a GPS ping. Called from the driver client every few seconds. */
export async function pushDriverLocation(
  sb: SupabaseClient,
  driverId: string,
  point: { lng: number; lat: number; heading?: number | null; speed?: number | null; accuracy?: number | null },
): Promise<void> {
  const wkt = `POINT(${point.lng} ${point.lat})`;
  const { error } = await sb.from("driver_locations").insert({
    driver_id: driverId,
    location: wkt,
    heading: point.heading ?? null,
    speed_kmh: point.speed ?? null,
    accuracy_m: point.accuracy ?? null,
  });
  if (error) throw error;
}

/** Toggle driver ONLINE/OFFLINE (used by the top-bar switch). */
export async function setDriverStatus(
  sb: SupabaseClient,
  driverId: string,
  status: "online" | "offline",
): Promise<void> {
  const { error } = await sb
    .from("drivers")
    .update({ status })
    .eq("id", driverId);
  if (error) throw error;
}

/** For sanity checks in UI. */
export function isActiveMissionStatus(s: OrderStatus): boolean {
  return DRIVER_ACTIVE_STATUSES.includes(s);
}
