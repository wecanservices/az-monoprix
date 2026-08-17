import type { NextRequest } from "next/server";
import { requireDriver } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptMission, assignDriver } from "@/services/delivery";
import { ok, fail } from "@/lib/api/response";

/**
 * Driver-initiated claim: assign self to the order, then accept.
 * Uses service_role because assignment + status transition must be
 * atomic even for a driver who wouldn't normally UPDATE `orders`.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireDriver();
    const { id } = await ctx.params;
    const sb = createAdminClient();
    await assignDriver(sb, id, session.id);
    await acceptMission(sb, id, session.id);
    return ok({ order_id: id, accepted: true });
  } catch (e) {
    return fail("accept_failed", (e as Error).message, 400);
  }
}
