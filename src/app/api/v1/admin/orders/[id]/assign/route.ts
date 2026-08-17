import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignDriver } from "@/services/delivery";
import { rankDriversForOrder } from "@/services/dispatch";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({ driverId: z.string().uuid() });

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const candidates = await rankDriversForOrder(createAdminClient(), id);
    return ok(candidates);
  } catch (e) {
    return fail("rank_error", (e as Error).message, 500);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await assignDriver(createAdminClient(), id, parsed.data.driverId);
    return ok({ assigned: true });
  } catch (e) {
    return fail("assign_error", (e as Error).message, 400);
  }
}
