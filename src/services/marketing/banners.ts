import type { SupabaseClient } from "@supabase/supabase-js";

export interface BannerRow {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  position: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

export async function listActiveBanners(sb: SupabaseClient): Promise<BannerRow[]> {
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("banners")
    .select("id, title, image_url, link_url, position, starts_at, ends_at, is_active")
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("position");
  if (error) throw error;
  return (data ?? []) as BannerRow[];
}

export async function adminListBanners(sb: SupabaseClient): Promise<BannerRow[]> {
  const { data, error } = await sb
    .from("banners")
    .select("id, title, image_url, link_url, position, starts_at, ends_at, is_active")
    .order("position");
  if (error) throw error;
  return (data ?? []) as BannerRow[];
}

export interface BannerInput {
  id?: string;
  title?: string | null;
  image_url: string;
  link_url?: string | null;
  position?: number;
  starts_at?: string;
  ends_at?: string | null;
  is_active?: boolean;
}

export async function adminUpsertBanner(sb: SupabaseClient, input: BannerInput) {
  if (input.id) {
    const { error } = await sb.from("banners").update(input).eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await sb.from("banners").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function adminDeleteBanner(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("banners").delete().eq("id", id);
  if (error) throw error;
}
