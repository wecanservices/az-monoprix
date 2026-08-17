import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminDeleteCategory } from "@/services/admin";
import { ok, fail } from "@/lib/api/response";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await adminDeleteCategory(createAdminClient(), id);
    return ok({ deleted: true });
  } catch (e) {
    return fail("category_delete", (e as Error).message, 400);
  }
}
