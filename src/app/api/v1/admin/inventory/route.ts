import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAdjustStock, adminListInventory } from "@/services/admin";
import { ok, fail } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const storeId = req.nextUrl.searchParams.get("storeId") ?? undefined;
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const lowOnly = req.nextUrl.searchParams.get("low") === "1";
    const data = await adminListInventory(sb, { storeId, search, lowOnly });
    return ok(data);
  } catch (e) {
    return fail("inventory_error", (e as Error).message, 500);
  }
}

const adjustSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().max(200).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = adjustSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    const session = await requireAdmin();
    await adminAdjustStock(
      createAdminClient(),
      parsed.data.storeId,
      parsed.data.productId,
      parsed.data.delta,
      parsed.data.reason ?? null,
      session.id,
    );
    return ok({ ok: true });
  } catch (e) {
    return fail("adjust_error", (e as Error).message, 400);
  }
}
