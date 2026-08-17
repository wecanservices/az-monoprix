import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  finishPreparation,
  markItem,
  startPreparation,
} from "@/services/preparation";
import { ok, fail } from "@/lib/api/response";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("finish") }),
  z.object({
    action: z.literal("mark_item"),
    itemId: z.string().uuid(),
    picked: z.number().int().min(0).nullable().optional(),
    unavailable: z.boolean().optional(),
    replacementProductId: z.string().uuid().nullable().optional(),
  }),
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());

  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const sb = createAdminClient();

    switch (parsed.data.action) {
      case "start":
        await startPreparation(sb, id, session.id);
        break;
      case "finish":
        await finishPreparation(sb, id, session.id);
        break;
      case "mark_item":
        await markItem(sb, parsed.data.itemId, {
          picked: parsed.data.picked ?? null,
          unavailable: parsed.data.unavailable,
          replacementProductId: parsed.data.replacementProductId ?? null,
        }, session.id);
        break;
    }
    return ok({ ok: true });
  } catch (e) {
    return fail("prepare_error", (e as Error).message, 400);
  }
}
