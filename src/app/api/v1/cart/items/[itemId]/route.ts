import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCartItemQuantity, removeCartItem } from "@/services/cart";
import { getSession } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";

const patchSchema = z.object({ quantity: z.number().int().min(0).max(50) });

async function client() {
  const session = await getSession();
  return session ? await createClient() : createAdminClient();
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await updateCartItemQuantity(await client(), itemId, parsed.data.quantity);
    return ok({ id: itemId, quantity: parsed.data.quantity });
  } catch (e) {
    return fail("update_failed", (e as Error).message, 400);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;
  try {
    await removeCartItem(await client(), itemId);
    return ok({ id: itemId, deleted: true });
  } catch (e) {
    return fail("delete_failed", (e as Error).message, 400);
  }
}
