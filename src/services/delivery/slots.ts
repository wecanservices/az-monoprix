import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverySlot } from "@/services/types";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";

/**
 * Compute delivery slots for the next N days for a given store.
 * We combine the store's recurring day_of_week slots + any date-specific
 * overrides, then filter out slots already past (for today).
 */
export async function listUpcomingSlots(
  sb: SupabaseClient,
  storeId: string,
  daysAhead = 5,
): Promise<{ date: string; label: string; slots: DeliverySlot[] }[]> {
  const { data, error } = await sb
    .from("store_slots")
    .select("id, day_of_week, slot_date, starts_at, ends_at, capacity, mode")
    .eq("store_id", storeId)
    .eq("is_active", true);
  if (error) throw error;
  const rows = (data ?? []) as DeliverySlot[];

  const days: { date: string; label: string; slots: DeliverySlot[] }[] = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < daysAhead; i++) {
    const day = addDays(today, i);
    const iso = format(day, "yyyy-MM-dd");
    const dow = day.getDay();
    const label =
      i === 0 ? "Aujourd'hui" :
      i === 1 ? "Demain" :
      format(day, "EEEE d MMMM");

    const dateOverrides = rows.filter((r) => r.slot_date === iso);
    const recurring = rows.filter((r) => r.day_of_week === dow && !r.slot_date);
    const combined = [...dateOverrides, ...recurring];

    // Filter past slots for today
    const usable = combined.filter((s) => {
      if (i > 0) return true;
      const [h, m] = s.starts_at.split(":").map(Number);
      const slotStart = new Date();
      slotStart.setHours(h, m, 0, 0);
      return !isBefore(slotStart, new Date());
    });

    // Dedup by start-end
    const seen = new Set<string>();
    const unique = usable.filter((s) => {
      const k = `${s.starts_at}-${s.ends_at}-${s.mode}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    if (unique.length > 0) days.push({ date: iso, label, slots: unique });
  }

  return days;
}

/** Turn "10:00" + a date into an ISO timestamp. */
export function slotIsoRange(date: string, starts: string, ends: string) {
  const day = parseISO(date);
  const [sh, sm] = starts.split(":").map(Number);
  const [eh, em] = ends.split(":").map(Number);
  const s = new Date(day);
  s.setHours(sh, sm, 0, 0);
  const e = new Date(day);
  e.setHours(eh, em, 0, 0);
  return { start: s.toISOString(), end: e.toISOString() };
}
