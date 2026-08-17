import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { askAdminAssistant } from "@/services/ai/admin";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({ question: z.string().min(3).max(1000) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    const session = await requireAdmin();
    const result = await askAdminAssistant(createAdminClient(), {
      userId: session.id,
      question: parsed.data.question,
    });
    return ok(result);
  } catch (e) {
    return fail("ai_error", (e as Error).message, 500);
  }
}
