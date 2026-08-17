import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addToCart, getOrCreateCart } from "@/services/cart";
import { getSession } from "@/lib/auth/session";
import { getOrSetSessionId } from "@/lib/cart/session-cookie";
import { ok, fail } from "@/lib/api/response";

const bodySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50).default(1),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());

  try {
    const session = await getSession();
    const sb = session ? await createClient() : createAdminClient();
    const sessionId = session ? null : await getOrSetSessionId();
    const cart = await getOrCreateCart(sb, {
      customerId: session?.id ?? null,
      sessionId,
    });
    const item = await addToCart(
      sb,
      { id: cart.id, store_id: cart.store_id! },
      parsed.data.productId,
      parsed.data.quantity,
    );
    return ok(item);
  } catch (e) {
    return fail("add_to_cart_failed", (e as Error).message, 400);
  }
}
