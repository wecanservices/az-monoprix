import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addTicketMessage, updateTicketStatus } from "@/services/support";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  body: z.string().min(1).max(2000),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    const session = await getSession();
    if (!session) return fail("unauthorized", "Auth required", 401);
    const { id } = await ctx.params;
    const sb = await createClient();
    await addTicketMessage(sb, id, session.id, parsed.data.body);
    if (parsed.data.status) await updateTicketStatus(sb, id, parsed.data.status);
    return ok({ ok: true });
  } catch (e) {
    return fail("ticket_message", (e as Error).message, 400);
  }
}
