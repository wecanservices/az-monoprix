import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListProducts, adminUpsertProduct } from "@/services/admin";
import { ok, fail } from "@/lib/api/response";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(2).max(60),
  name_fr: z.string().min(1).max(200),
  name_ar: z.string().optional().nullable(),
  description_fr: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  base_price: z.number().nonnegative(),
  unit: z.string().optional().nullable(),
  unit_size: z.number().optional().nullable(),
  weight_grams: z.number().int().optional().nullable(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
    const data = await adminListProducts(sb, { search, categoryId });
    return ok(data);
  } catch (e) {
    return fail("admin_products_error", (e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());
  try {
    await requireAdmin();
    const id = await adminUpsertProduct(createAdminClient(), parsed.data);
    return ok({ id });
  } catch (e) {
    return fail("admin_products_upsert", (e as Error).message, 400);
  }
}
