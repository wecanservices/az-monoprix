import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { placeOrder } from "@/services/checkout";
import { getSession } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { DEFAULT_STORE_ID } from "@/services/stores";

const schema = z.object({
  fulfillmentMode: z.enum(["delivery", "drive", "pickup"]),
  slotId: z.string().uuid().nullable().optional(),
  scheduledStart: z.string().nullable().optional(),
  scheduledEnd: z.string().nullable().optional(),
  addressSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  paymentMethod: z.enum(["cash_on_delivery", "card_on_delivery", "card_online", "edahabia", "cib", "wallet"]),
  notes: z.string().max(500).nullable().optional(),
  deliveryFee: z.number().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());

  const session = await getSession();
  if (!session) return fail("unauthorized", "Auth required", 401);

  try {
    const sb = createAdminClient(); // atomic multi-table writes require service_role
    const result = await placeOrder(sb, {
      customerId: session.id,
      storeId: DEFAULT_STORE_ID,
      fulfillmentMode: parsed.data.fulfillmentMode,
      slotId: parsed.data.slotId ?? null,
      scheduledStart: parsed.data.scheduledStart ?? null,
      scheduledEnd: parsed.data.scheduledEnd ?? null,
      addressSnapshot: parsed.data.addressSnapshot ?? null,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes ?? null,
      deliveryFee: parsed.data.deliveryFee ?? 250,
    });
    return ok(result);
  } catch (e) {
    return fail("place_order_failed", (e as Error).message, 400);
  }
}
