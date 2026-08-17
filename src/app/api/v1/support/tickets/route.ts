import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createTicket } from "@/services/support";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  category: z.enum(["order", "product", "payment", "delivery", "driver", "refund", "other"]),
  subject: z.string().min(3).max(200),
  description: z.string().max(2000).optional().nullable(),
  order_id: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    const session = await requireCustomer();
    const id = await createTicket(await createClient(), {
      customer_id: session.id,
      ...parsed.data,
    });
    return ok({ id });
  } catch (e) {
    return fail("ticket_create", (e as Error).message, 400);
  }
}
