import type { NextRequest } from "next/server";
import { z } from "zod";
import { createReadServerClient } from "@/lib/supabase/anon-server";
import { listProducts } from "@/services/products";
import { DEFAULT_STORE_ID } from "@/services/stores";
import { ok, fail } from "@/lib/api/response";

const query = z.object({
  storeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  featured: z.enum(["1", "true"]).optional(),
  promoted: z.enum(["1", "true"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return fail("bad_request", "Invalid query", 400, parsed.error.flatten());

  const sb = createReadServerClient();
  try {
    const products = await listProducts(sb, {
      storeId: parsed.data.storeId ?? DEFAULT_STORE_ID,
      categoryId: parsed.data.categoryId,
      categorySlug: parsed.data.categorySlug,
      search: parsed.data.search,
      featuredOnly: !!parsed.data.featured,
      promotedOnly: !!parsed.data.promoted,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return ok(products, { count: products.length });
  } catch (e) {
    return fail("db_error", (e as Error).message, 500);
  }
}
