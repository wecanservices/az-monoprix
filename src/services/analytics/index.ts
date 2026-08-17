import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Analytics service. Reads from `v_*` views defined in the analytics
 * migration — never issues ad-hoc joins so the AI admin assistant
 * (P7) can safely reuse the same surface.
 */

export interface KpiSummary {
  today: { orders: number; revenue: number; basket_avg: number; unique_customers: number };
  last_7d: { orders: number; revenue: number; basket_avg: number };
  last_30d: { orders: number; revenue: number; basket_avg: number };
  daily: { day: string; revenue: number; orders: number }[];
}

export async function getKpiSummary(sb: SupabaseClient): Promise<KpiSummary> {
  const { data } = await sb
    .from("v_kpis_daily")
    .select("day, orders, delivered, revenue, basket_avg, unique_customers")
    .order("day", { ascending: false })
    .limit(90);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];

  const todayIso = new Date().toISOString().slice(0, 10);
  const today = rows.find((r) => String(r.day).startsWith(todayIso));

  const bucket = (n: number) => rows.slice(0, n);
  const sum = (arr: Array<Record<string, unknown>>, key: string) =>
    arr.reduce((n, r) => n + Number(r[key] ?? 0), 0);
  const avg = (arr: Array<Record<string, unknown>>, key: string) =>
    arr.length ? sum(arr, key) / arr.length : 0;

  return {
    today: {
      orders: Number(today?.orders ?? 0),
      revenue: Number(today?.revenue ?? 0),
      basket_avg: Number(today?.basket_avg ?? 0),
      unique_customers: Number(today?.unique_customers ?? 0),
    },
    last_7d: {
      orders: sum(bucket(7), "orders"),
      revenue: sum(bucket(7), "revenue"),
      basket_avg: Math.round(avg(bucket(7), "basket_avg")),
    },
    last_30d: {
      orders: sum(bucket(30), "orders"),
      revenue: sum(bucket(30), "revenue"),
      basket_avg: Math.round(avg(bucket(30), "basket_avg")),
    },
    daily: rows
      .slice(0, 30)
      .reverse()
      .map((r) => ({
        day: String(r.day).slice(0, 10),
        revenue: Number(r.revenue ?? 0),
        orders: Number(r.orders ?? 0),
      })),
  };
}

export async function getTopProducts(sb: SupabaseClient, limit = 10) {
  const { data } = await sb
    .from("v_top_products")
    .select("product_id, sku, name, units_sold, revenue, orders")
    .limit(limit);
  return data ?? [];
}

export async function getTopCategories(sb: SupabaseClient, limit = 10) {
  const { data } = await sb
    .from("v_top_categories")
    .select("category_id, category_name, icon, units_sold, revenue, orders")
    .limit(limit);
  return data ?? [];
}

export async function getStockAlerts(sb: SupabaseClient) {
  const { data } = await sb
    .from("v_stock_alerts")
    .select("*")
    .limit(50);
  return data ?? [];
}

export async function getDriverPerformance(sb: SupabaseClient) {
  const { data } = await sb
    .from("v_driver_performance")
    .select("*")
    .order("deliveries", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getSegmentCounts(sb: SupabaseClient) {
  const { data } = await sb.from("v_segment_counts").select("*");
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[String(r.segment)] = Number(r.customers);
  return map;
}

export async function getCustomersBySegment(
  sb: SupabaseClient,
  segment: string,
  limit = 100,
) {
  const { data } = await sb
    .from("v_customer_segments")
    .select("id, delivered_orders, lifetime_value, last_order_at")
    .eq("segment", segment)
    .order("lifetime_value", { ascending: false })
    .limit(limit);
  return data ?? [];
}
