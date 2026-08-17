import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireDriver } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushDriverLocation, setDriverStatus } from "@/services/delivery";
import { ok, fail } from "@/lib/api/response";

const pointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional().nullable(),
  speed: z.number().optional().nullable(),
  accuracy: z.number().optional().nullable(),
});

const bodySchema = z.union([
  pointSchema,
  z.object({ status: z.enum(["online", "offline"]) }),
]);

/**
 * Combined endpoint: POST a GPS ping OR toggle the ONLINE/OFFLINE
 * status. Keeping one route means the driver client only needs a
 * single POST for both cases, from the same authenticated context.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);

  try {
    const session = await requireDriver();
    const sb = createAdminClient();
    if ("status" in parsed.data) {
      await setDriverStatus(sb, session.id, parsed.data.status);
      return ok({ status: parsed.data.status });
    }
    await pushDriverLocation(sb, session.id, parsed.data);
    return ok({ pushed: true });
  } catch (e) {
    return fail("location_error", (e as Error).message, 400);
  }
}
