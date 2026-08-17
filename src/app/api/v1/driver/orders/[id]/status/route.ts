import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireDriver } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceMission, completeDelivery } from "@/services/delivery";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  to: z.enum([
    "go_to_store",
    "at_store",
    "picked_up",
    "go_to_customer",
    "at_customer",
    "delivered",
  ]),
  otp: z.string().length(4).optional(),
  photoUrl: z.string().url().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);

  try {
    const session = await requireDriver();
    const sb = createAdminClient();

    if (parsed.data.to === "delivered") {
      if (!parsed.data.otp) return fail("otp_required", "OTP is required to deliver", 400);
      await completeDelivery(sb, id, session.id, parsed.data.otp, parsed.data.photoUrl ?? null);
    } else {
      await advanceMission(sb, id, session.id, parsed.data.to);
    }

    return ok({ order_id: id, status: parsed.data.to });
  } catch (e) {
    return fail("status_error", (e as Error).message, 400);
  }
}
