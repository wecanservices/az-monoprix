import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateCart } from "@/services/cart";
import { getSession } from "@/lib/auth/session";
import { getOrSetSessionId } from "@/lib/cart/session-cookie";
import { ok, fail } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await getSession();
    // Anonymous carts must bypass RLS since guests aren't authenticated.
    const sb = session ? await createClient() : createAdminClient();
    const sessionId = session ? null : await getOrSetSessionId();
    const cart = await getOrCreateCart(sb, {
      customerId: session?.id ?? null,
      sessionId,
    });
    return ok(cart);
  } catch (e) {
    return fail("cart_error", (e as Error).message, 500);
  }
}
