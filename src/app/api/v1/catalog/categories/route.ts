import { createReadServerClient } from "@/lib/supabase/anon-server";
import { listCategories } from "@/services/products";
import { ok, fail } from "@/lib/api/response";

export async function GET() {
  const sb = createReadServerClient();
  try {
    const cats = await listCategories(sb);
    return ok(cats);
  } catch (e) {
    return fail("db_error", (e as Error).message, 500);
  }
}
