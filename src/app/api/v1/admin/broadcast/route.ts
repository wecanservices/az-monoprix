import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastToSegment } from "@/services/notifications";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  segment: z.enum(["nouveau", "actif", "fidele", "vip", "inactif"]),
  title: z.string().min(2).max(160),
  body: z.string().max(500).optional(),
  link_url: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireAdmin();
    const res = await broadcastToSegment(createAdminClient(), parsed.data.segment, parsed.data);
    return ok(res);
  } catch (e) {
    return fail("broadcast_error", (e as Error).message, 400);
  }
}
