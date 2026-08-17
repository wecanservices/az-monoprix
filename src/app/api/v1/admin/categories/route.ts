import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUpsertCategory } from "@/services/admin";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name_fr: z.string().min(1).max(120),
  name_ar: z.string().optional().nullable(),
  name_en: z.string().optional().nullable(),
  icon: z.string().max(4).optional().nullable(),
  position: z.number().int().optional(),
  is_active: z.boolean().optional(),
  parent_id: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());
  try {
    await requireAdmin();
    const id = await adminUpsertCategory(createAdminClient(), parsed.data);
    return ok({ id });
  } catch (e) {
    return fail("category_upsert", (e as Error).message, 400);
  }
}
