import type { NextRequest } from "next/server";
import { requireDriver } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { refuseMission } from "@/services/delivery";
import { ok, fail } from "@/lib/api/response";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireDriver();
    const { id } = await ctx.params;
    await refuseMission(createAdminClient(), id, session.id);
    return ok({ order_id: id, refused: true });
  } catch (e) {
    return fail("refuse_failed", (e as Error).message, 400);
  }
}
