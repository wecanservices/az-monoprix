import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { runShoppingAssistant, resolveSuggestionsWithPrices } from "@/services/ai/shopping";
import { DEFAULT_STORE_ID } from "@/services/stores";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  budget: z.number().positive().nullable().optional(),
  people: z.number().int().min(1).max(20).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);

  try {
    const session = await getSession();
    const sb = createAdminClient();
    const result = await runShoppingAssistant(sb, {
      userId: session?.id ?? null,
      prompt: parsed.data.prompt,
      storeId: DEFAULT_STORE_ID,
      budgetDzd: parsed.data.budget ?? null,
      people: parsed.data.people ?? null,
    });

    // Attach IDs/prices/images so the UI can render + add to cart.
    const enriched = await resolveSuggestionsWithPrices(
      sb,
      DEFAULT_STORE_ID,
      result.suggestions,
    );

    return ok({ ...result, suggestions: enriched });
  } catch (e) {
    return fail("ai_error", (e as Error).message, 500);
  }
}
