import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a short-lived signed URL that the browser POSTs the image to.
 * The bucket is public-read + admin-write; the signed URL avoids
 * uploading through our Next server (bandwidth + memory).
 */
export const PRODUCT_IMAGES_BUCKET = "product-images";

export async function createProductImageUploadUrl(
  sb: SupabaseClient,
  productId: string,
  fileExt: string,
): Promise<{ path: string; token: string; publicUrl: string }> {
  const safeExt = (fileExt || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const path = `${productId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.storage.from(PRODUCT_IMAGES_BUCKET) as any)
    .createSignedUploadUrl(path);
  if (error) throw error;

  const { data: pub } = sb.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return { path, token: data.token, publicUrl: pub.publicUrl };
}

export async function attachProductImage(
  sb: SupabaseClient,
  productId: string,
  url: string,
  position = 0,
): Promise<string> {
  const { data, error } = await sb
    .from("product_images")
    .insert({ product_id: productId, url, position })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function detachProductImage(sb: SupabaseClient, imageId: string) {
  const { error } = await sb.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
}
