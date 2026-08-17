import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { respondReplacement } from "@/services/preparation";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  replacementId: z.string().uuid(),
  response: z.enum(["accepted", "rejected", "refunded"]),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireCustomer();
    // The customer's session (RLS) already scopes access via order ownership.
    await respondReplacement(await createClient(), parsed.data.replacementId, parsed.data.response);
    return ok({ ok: true });
  } catch (e) {
    return fail("replacement_error", (e as Error).message, 400);
  }
}
