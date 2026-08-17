import type { SupabaseClient } from "@supabase/supabase-js";
import { runCompletion, aiAvailable } from "@/lib/ai/provider";

/**
 * "Assistant Courses" — takes a natural-language brief, retrieves a
 * bounded set of SKUs from the catalogue, calls the LLM with that
 * whitelist as the only allowed universe, and validates every SKU
 * returned. Missing/invalid SKUs are dropped rather than surfaced.
 */

export interface Suggestion {
  sku: string;
  quantity: number;
  reason: string;
}

export interface ShoppingResult {
  available: boolean;
  message?: string;
  suggestions: Suggestion[];
  total_estimate: number;
  fallback?: boolean;
}

const SYSTEM = `You are the AZ Monoprix in-store shopping assistant.

STRICT RULES:
1. You may ONLY reference SKUs from the CATALOG list provided below.
2. NEVER invent SKUs, prices, or products. If nothing fits, return an empty suggestions array.
3. Respect the user's budget when given. Do not exceed it.
4. Return ONLY valid minified JSON with this shape:
   {"suggestions":[{"sku":"...","quantity":1,"reason":"..."}],"message":"..."}
5. Keep reasons short (≤80 chars, French).
6. Prefer promo-priced items when they match the intent.`;

interface CatalogEntry {
  sku: string; name: string; unit: string | null; price: number;
  promo_price: number | null; category: string | null;
}

export async function runShoppingAssistant(
  sb: SupabaseClient,
  opts: { userId?: string | null; prompt: string; storeId: string; budgetDzd?: number | null; people?: number | null },
): Promise<ShoppingResult> {
  const promptWords = opts.prompt.toLowerCase();
  const contextWords = extractKeywords(promptWords);

  // Retrieve up to 100 candidate products from the store catalogue.
  let q = sb
    .from("products")
    .select(`
      sku, name_fr, unit, base_price,
      store_products!inner(store_id, price, promo_price, is_available),
      inventory!inner(store_id, on_hand, reserved),
      category:categories(name_fr)
    `)
    .eq("is_active", true)
    .eq("store_products.store_id", opts.storeId)
    .eq("inventory.store_id", opts.storeId)
    .eq("store_products.is_available", true)
    .limit(100);
  if (contextWords.length > 0) {
    const ors = contextWords.map((w) => `name_fr.ilike.%${w}%`).join(",");
    q = q.or(ors);
  }
  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catalog: CatalogEntry[] = (data ?? []).map((r: any) => {
    const sp = Array.isArray(r.store_products) ? r.store_products[0] : r.store_products;
    const cat = Array.isArray(r.category) ? r.category[0] : r.category;
    return {
      sku: r.sku,
      name: r.name_fr,
      unit: r.unit,
      price: Number(sp?.price ?? r.base_price),
      promo_price: sp?.promo_price != null ? Number(sp.promo_price) : null,
      category: cat?.name_fr ?? null,
    };
  }).slice(0, 60);

  const validSkus = new Set(catalog.map((c) => c.sku));

  if (!aiAvailable()) {
    // Fallback: keyword-based selection so the UI is testable without an API key.
    const picks = catalog.slice(0, 8);
    const total = picks.reduce((n, p) => n + (p.promo_price ?? p.price), 0);
    return {
      available: false,
      fallback: true,
      message: "Assistant IA non configuré — sélection basée sur des mots-clés.",
      suggestions: picks.map((p) => ({
        sku: p.sku,
        quantity: 1,
        reason: `${p.category ?? "Produit"} correspondant`,
      })),
      total_estimate: total,
    };
  }

  const userMsg = [
    `DEMANDE: ${opts.prompt}`,
    opts.people ? `PERSONNES: ${opts.people}` : null,
    opts.budgetDzd ? `BUDGET: ${opts.budgetDzd} DZD (à ne pas dépasser)` : null,
    "",
    "CATALOG (JSON):",
    JSON.stringify(catalog),
    "",
    "Retourne UNIQUEMENT le JSON demandé.",
  ].filter(Boolean).join("\n");

  const res = await runCompletion<{
    suggestions?: { sku?: string; quantity?: number; reason?: string }[];
    message?: string;
  }>({
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ],
    json: true,
    temperature: 0.3,
    maxTokens: 800,
  });

  if (!res.ok) {
    return {
      available: false,
      message: `Assistant indisponible : ${res.message}`,
      suggestions: [],
      total_estimate: 0,
    };
  }

  const raw = res.data.suggestions ?? [];
  const cleaned: Suggestion[] = [];
  let total = 0;
  for (const s of raw) {
    if (!s.sku || !validSkus.has(s.sku)) continue;
    const catRow = catalog.find((c) => c.sku === s.sku)!;
    const qty = Math.max(1, Math.min(10, Number(s.quantity ?? 1)));
    cleaned.push({ sku: s.sku, quantity: qty, reason: (s.reason ?? "").slice(0, 120) });
    total += (catRow.promo_price ?? catRow.price) * qty;
  }

  // Persist the AI conversation for audit + future improvements.
  if (opts.userId) {
    const { data: conv } = await sb
      .from("ai_conversations")
      .insert({
        user_id: opts.userId,
        purpose: "shopping",
        context: { store_id: opts.storeId, budget: opts.budgetDzd, people: opts.people },
      })
      .select("id")
      .single();
    if (conv) {
      await sb.from("ai_messages").insert([
        { conversation_id: conv.id, role: "user", content: opts.prompt },
        {
          conversation_id: conv.id,
          role: "assistant",
          content: res.data.message ?? "",
          structured: { suggestions: cleaned, total_estimate: total },
          provided_skus: catalog.map((c) => c.sku),
          tokens_input: res.tokensIn ?? null,
          tokens_output: res.tokensOut ?? null,
          latency_ms: res.latencyMs,
        },
      ]);
    }
  }

  return {
    available: true,
    message: res.data.message,
    suggestions: cleaned,
    total_estimate: Math.round(total),
  };
}

function extractKeywords(prompt: string): string[] {
  // Trivially strip stopwords; enough for retrieval that the LLM refines.
  const stop = new Set(["je","tu","le","la","les","des","un","une","pour","de","du","au","à","et","ou","avec","sans","dans","sur","chez"]);
  return prompt
    .split(/[^a-zàâäéèêëïîôöùûüç0-9]+/i)
    .map((w) => w.toLowerCase().trim())
    .filter((w) => w.length > 2 && !stop.has(w))
    .slice(0, 8);
}

export async function resolveSuggestionsWithPrices(
  sb: SupabaseClient,
  storeId: string,
  suggestions: Suggestion[],
): Promise<Array<Suggestion & {
  product_id: string; name_fr: string; price: number;
  promo_price: number | null; image_url: string | null;
}>> {
  if (suggestions.length === 0) return [];
  const skus = suggestions.map((s) => s.sku);
  const { data } = await sb
    .from("products")
    .select(`
      id, sku, name_fr,
      store_products!inner(store_id, price, promo_price),
      images:product_images(url, position)
    `)
    .in("sku", skus)
    .eq("store_products.store_id", storeId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bySku = new Map<string, any>((data ?? []).map((r: any) => [r.sku, r]));
  return suggestions
    .filter((s) => bySku.has(s.sku))
    .map((s) => {
      const r = bySku.get(s.sku);
      const sp = Array.isArray(r.store_products) ? r.store_products[0] : r.store_products;
      const img = ((r.images ?? []) as { url: string; position: number }[])
        .sort((a, b) => a.position - b.position)[0]?.url ?? null;
      return {
        ...s,
        product_id: r.id,
        name_fr: r.name_fr,
        price: Number(sp?.price ?? 0),
        promo_price: sp?.promo_price != null ? Number(sp.promo_price) : null,
        image_url: img,
      };
    });
}
