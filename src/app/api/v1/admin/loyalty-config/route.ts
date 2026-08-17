import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateLoyaltyConfig } from "@/services/marketing/loyalty";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  points_per_dzd: z.number().positive(),
  dzd_per_point: z.number().positive(),
  min_redeem_points: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireAdmin();
    await updateLoyaltyConfig(createAdminClient(), parsed.data);
    return ok({ ok: true });
  } catch (e) {
    return fail("loyalty_config_error", (e as Error).message, 400);
  }
}
