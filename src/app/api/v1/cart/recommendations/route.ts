import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateCart } from "@/services/cart";
import { getSession } from "@/lib/auth/session";
import { readSessionId } from "@/lib/cart/session-cookie";
import { recommendForCart } from "@/services/ai/recommendations";
import { ok, fail } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await getSession();
    const sb = session ? await createClient() : createAdminClient();
    const sessionId = session ? null : await readSessionId();
    const cart = await getOrCreateCart(sb, { customerId: session?.id ?? null, sessionId });
    const items = await recommendForCart(
      createAdminClient(),
      cart.items.map((it) => it.product_id),
      cart.store_id!,
      6,
    );
    return ok(items);
  } catch (e) {
    return fail("reco_error", (e as Error).message, 500);
  }
}
