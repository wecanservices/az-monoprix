import type { NextRequest } from "next/server";
import { z } from "zod";
import { createReadServerClient } from "@/lib/supabase/anon-server";
import { getProductByBarcode } from "@/services/products";
import { DEFAULT_STORE_ID } from "@/services/stores";
import { ok, fail } from "@/lib/api/response";

/**
 * GET /api/v1/client/scan?code=6134091915159[&storeId=…]
 *
 * Retour :
 *   200 { productId, price, promo_price, name_fr }
 *   404 { error: "not_found" }
 */

const query = z.object({
  code: z.string().min(6).max(24),
  storeId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return fail("bad_request", "Invalid query", 400, parsed.error.flatten());

  const sb = createReadServerClient();
  try {
    const p = await getProductByBarcode(
      sb,
      parsed.data.code,
      parsed.data.storeId ?? DEFAULT_STORE_ID,
    );
    if (!p) return fail("not_found", "Produit introuvable", 404);
    return ok({
      productId: p.id,
      sku: p.sku,
      name_fr: p.name_fr,
      price: p.price,
      promo_price: p.promo_price,
      is_available: p.is_available,
      on_hand: p.on_hand,
    });
  } catch (e) {
    return fail("internal", e instanceof Error ? e.message : "Erreur", 500);
  }
}
