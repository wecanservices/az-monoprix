import { requireDriver } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listAvailableMissions, listDriverMissions } from "@/services/delivery";
import { ok, fail } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await requireDriver();
    const sb = await createClient();
    const [mine, pool] = await Promise.all([
      listDriverMissions(sb, session.id),
      listAvailableMissions(sb),
    ]);
    return ok({ mine, pool });
  } catch (e) {
    return fail("driver_missions_error", (e as Error).message, 500);
  }
}
