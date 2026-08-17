import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSetDriverVerified } from "@/services/admin";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({ verified: z.boolean() });

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await adminSetDriverVerified(createAdminClient(), id, parsed.data.verified);
    return ok({ ok: true });
  } catch (e) {
    return fail("verify_error", (e as Error).message, 400);
  }
}
