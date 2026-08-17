import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachProductImage, createProductImageUploadUrl } from "@/services/marketing/media";
import { ok, fail } from "@/lib/api/response";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("sign"),
    productId: z.string().uuid(),
    ext: z.string().max(6).default("jpg"),
  }),
  z.object({
    action: z.literal("attach"),
    productId: z.string().uuid(),
    url: z.string().url(),
    position: z.number().int().min(0).optional(),
  }),
]);

/**
 * Two-step upload flow to avoid piping the file through our server:
 *   1) POST { action: "sign", productId, ext } → { path, token, publicUrl }
 *   2) Browser PUTs the file to `path` with the signed token
 *   3) POST { action: "attach", productId, url } → creates the product_image row
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Invalid body", 400);
  try {
    await requireAdmin();
    const sb = createAdminClient();
    if (parsed.data.action === "sign") {
      const info = await createProductImageUploadUrl(sb, parsed.data.productId, parsed.data.ext);
      return ok(info);
    }
    const id = await attachProductImage(sb, parsed.data.productId, parsed.data.url, parsed.data.position ?? 0);
    return ok({ id });
  } catch (e) {
    return fail("upload_error", (e as Error).message, 400);
  }
}
