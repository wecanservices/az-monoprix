import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminDeleteBanner, adminUpsertBanner } from "@/services/marketing/banners";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(160).nullable().optional(),
  image_url: z.string().min(2),
  link_url: z.string().nullable().optional(),
  position: z.number().int().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireAdmin();
    const id = await adminUpsertBanner(createAdminClient(), parsed.data);
    return ok({ id });
  } catch (e) {
    return fail("banner_upsert", (e as Error).message, 400);
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("bad_request", "id required", 400);
  try {
    await requireAdmin();
    await adminDeleteBanner(createAdminClient(), id);
    return ok({ deleted: true });
  } catch (e) {
    return fail("delete_error", (e as Error).message, 400);
  }
}
