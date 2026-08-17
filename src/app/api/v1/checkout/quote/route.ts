import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateCart } from "@/services/cart";
import { computeTotals } from "@/services/cart/totals";
import { getSession } from "@/lib/auth/session";
import { readSessionId } from "@/lib/cart/session-cookie";
import { ok, fail } from "@/lib/api/response";
import { listUpcomingSlots } from "@/services/delivery/slots";
import { DEFAULT_STORE_ID } from "@/services/stores";

const schema = z.object({
  fulfillmentMode: z.enum(["delivery", "drive", "pickup"]).default("delivery"),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);

  try {
    const session = await getSession();
    const sb = session ? await createClient() : createAdminClient();
    const sessionId = session ? null : await readSessionId();
    const cart = await getOrCreateCart(sb, {
      customerId: session?.id ?? null,
      sessionId,
    });

    const deliveryFee = parsed.data.fulfillmentMode === "delivery" ? 250 : 0;
    const totals = computeTotals(cart.items, { deliveryFee });

    const slots = await listUpcomingSlots(sb, cart.store_id ?? DEFAULT_STORE_ID);
    return ok({ cart, totals, slots });
  } catch (e) {
    return fail("quote_error", (e as Error).message, 500);
  }
}
