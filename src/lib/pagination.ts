/** Cursor / offset helpers shared by list APIs. */
export function parsePage(
  searchParams: URLSearchParams,
  defaults = { limit: 20, maxLimit: 100 },
): { limit: number; offset: number; page: number } {
  const raw = Number(searchParams.get("limit") ?? defaults.limit);
  const limit = Math.max(1, Math.min(defaults.maxLimit, isFinite(raw) ? raw : defaults.limit));
  const pageRaw = Number(searchParams.get("page") ?? 1);
  const page = Math.max(1, isFinite(pageRaw) ? pageRaw : 1);
  return { limit, offset: (page - 1) * limit, page };
}
