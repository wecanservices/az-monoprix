import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getKpiSummary,
  getStockAlerts,
  getTopCategories,
  getTopProducts,
  getSegmentCounts,
} from "@/services/analytics";
import { ok, fail } from "@/lib/api/response";

export async function GET() {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const [kpis, topProducts, topCategories, stockAlerts, segments] = await Promise.all([
      getKpiSummary(sb),
      getTopProducts(sb, 10),
      getTopCategories(sb, 8),
      getStockAlerts(sb),
      getSegmentCounts(sb),
    ]);
    return ok({ kpis, topProducts, topCategories, stockAlerts, segments });
  } catch (e) {
    return fail("analytics_error", (e as Error).message, 500);
  }
}
