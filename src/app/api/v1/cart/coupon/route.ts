import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateCart } from "@/services/cart";
import { computeTotals } from "@/services/cart/totals";
import { evaluateCoupon } from "@/services/marketing/coupons";
import { getSession } from "@/lib/auth/session";
import { readSessionId } from "@/lib/cart/session-cookie";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({ code: z.string().min(2).max(60) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);

  try {
    const session = await getSession();
    const sb = session ? await createClient() : createAdminClient();
    const sessionId = session ? null : await readSessionId();
    const cart = await getOrCreateCart(sb, { customerId: session?.id ?? null, sessionId });

    const subtotal = computeTotals(cart.items).subtotal;
    const evalRes = await evaluateCoupon(
      createAdminClient(),
      parsed.data.code,
      subtotal,
      session?.id ?? null,
    );

    if (!evalRes.valid) return fail("invalid_coupon", evalRes.reason, 400);

    // Store the code on the cart — real amount is recomputed at checkout.
    await sb.from("carts").update({ coupon_code: parsed.data.code }).eq("id", cart.id);

    return ok({
      code: parsed.data.code,
      amountOff: evalRes.amountOff,
      freeShipping: evalRes.freeShipping,
    });
  } catch (e) {
    return fail("coupon_error", (e as Error).message, 400);
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    const sb = session ? await createClient() : createAdminClient();
    const sessionId = session ? null : await readSessionId();
    const cart = await getOrCreateCart(sb, { customerId: session?.id ?? null, sessionId });
    await sb.from("carts").update({ coupon_code: null }).eq("id", cart.id);
    return ok({ removed: true });
  } catch (e) {
    return fail("coupon_error", (e as Error).message, 400);
  }
}
