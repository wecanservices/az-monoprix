import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUpsertStore } from "@/services/admin";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40).regex(/^[A-Z0-9-]+$/),
  name: z.string().min(2).max(160),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  wilaya_code: z.string().length(2).optional().nullable(),
  opens_at: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  closes_at: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  prep_capacity: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());
  try {
    await requireAdmin();
    const id = await adminUpsertStore(createAdminClient(), parsed.data);
    return ok({ id });
  } catch (e) {
    return fail("store_upsert", (e as Error).message, 400);
  }
}
