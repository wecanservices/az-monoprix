import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminGetProduct,
  adminSetStorePrice,
  adminToggleProductActive,
} from "@/services/admin";
import { ok, fail } from "@/lib/api/response";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const p = await adminGetProduct(createAdminClient(), id);
    if (!p) return fail("not_found", "Product not found", 404);
    return ok(p);
  } catch (e) {
    return fail("admin_products_get", (e as Error).message, 500);
  }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_active"), is_active: z.boolean() }),
  z.object({
    action: z.literal("set_store_price"),
    storeId: z.string().uuid(),
    price: z.number().nonnegative(),
    promoPrice: z.number().nonnegative().nullable(),
    isAvailable: z.boolean(),
  }),
]);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const sb = createAdminClient();
    switch (parsed.data.action) {
      case "set_active":
        await adminToggleProductActive(sb, id, parsed.data.is_active);
        break;
      case "set_store_price":
        await adminSetStorePrice(
          sb,
          parsed.data.storeId,
          id,
          parsed.data.price,
          parsed.data.promoPrice,
          parsed.data.isAvailable,
        );
        break;
    }
    return ok({ ok: true });
  } catch (e) {
    return fail("admin_products_patch", (e as Error).message, 400);
  }
}
