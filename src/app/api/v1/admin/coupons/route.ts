import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUpsertCoupon } from "@/services/marketing/coupons";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(60).regex(/^[A-Z0-9-]+$/i),
  description: z.string().max(300).nullable().optional(),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  value: z.number().nullable().optional(),
  min_order: z.number().nullable().optional(),
  max_redemptions: z.number().int().nullable().optional(),
  per_customer_limit: z.number().int().nullable().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());
  try {
    await requireAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = await adminUpsertCoupon(createAdminClient(), parsed.data as any);
    return ok({ id });
  } catch (e) {
    return fail("coupon_upsert", (e as Error).message, 400);
  }
}
