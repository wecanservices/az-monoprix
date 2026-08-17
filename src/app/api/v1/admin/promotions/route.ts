import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUpsertPromotion, adminSetPromotionProducts } from "@/services/marketing/promotions";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().max(60).nullable().optional(),
  name: z.string().min(2).max(160),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(["percentage", "fixed_amount", "buy_x_get_y", "bundle", "free_shipping"]),
  value: z.number().nullable().optional(),
  min_order: z.number().nullable().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  banner_url: z.string().url().nullable().optional(),
  product_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { product_ids, ...promo } = parsed.data;
    const id = await adminUpsertPromotion(sb, promo);
    if (product_ids) await adminSetPromotionProducts(sb, id, product_ids);
    return ok({ id });
  } catch (e) {
    return fail("promo_upsert", (e as Error).message, 400);
  }
}
