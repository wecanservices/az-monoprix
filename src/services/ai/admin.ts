import type { SupabaseClient } from "@supabase/supabase-js";
import { runCompletion, aiAvailable } from "@/lib/ai/provider";
import { getKpiSummary, getStockAlerts, getTopCategories, getTopProducts, getDriverPerformance, getSegmentCounts } from "@/services/analytics";
import { formatDZD } from "@/utils/money";

/**
 * Admin AI Assistant — grounded on the analytics views only.
 * We do NOT let the LLM write SQL. Instead we pre-compute the
 * relevant summary buckets and ask the model to *describe / compare*
 * them in prose. This eliminates the SQL-injection surface entirely
 * while keeping answers accurate to the current data.
 */

export interface AdminQueryResult {
  available: boolean;
  answer: string;
  sources: { key: string; label: string }[];
}

const SYSTEM = `You are the business assistant for the AZ Monoprix admin dashboard.

STRICT RULES:
1. Answer in French, in a clear, executive tone.
2. Base every number strictly on the "DATA" object provided. Do not invent metrics.
3. When quoting money, write it as "12 500 DA".
4. When the user asks for something the data does not cover, say so explicitly.
5. Keep answers concise: 3-6 sentences with bullet points only when useful.`;

export async function askAdminAssistant(
  sb: SupabaseClient,
  opts: { userId?: string | null; question: string },
): Promise<AdminQueryResult> {
  // Precompute the read-only summary bundle.
  const [kpis, topProducts, topCategories, stockAlerts, drivers, segments] = await Promise.all([
    getKpiSummary(sb),
    getTopProducts(sb, 10),
    getTopCategories(sb, 8),
    getStockAlerts(sb),
    getDriverPerformance(sb),
    getSegmentCounts(sb),
  ]);

  const data = {
    generated_at: new Date().toISOString(),
    kpis: {
      today: kpis.today,
      last_7d: kpis.last_7d,
      last_30d: kpis.last_30d,
    },
    top_products: topProducts.map((p) => ({
      name: p.name, sku: p.sku, units: p.units_sold, revenue_dzd: Number(p.revenue),
    })),
    top_categories: topCategories.map((c) => ({
      name: c.category_name, units: c.units_sold, revenue_dzd: Number(c.revenue),
    })),
    stock_alerts: stockAlerts.slice(0, 10).map((s) => ({
      product: s.product_name, store: s.store_name, on_hand: s.on_hand, available: s.available,
    })),
    driver_performance: drivers.slice(0, 10).map((d) => ({
      name: d.driver_name, deliveries: d.deliveries, avg_min: d.avg_minutes,
    })),
    customer_segments: segments,
  };

  if (!aiAvailable()) {
    return {
      available: false,
      answer: fallbackAnswer(opts.question, data),
      sources: describeSources(),
    };
  }

  const res = await runCompletion<string>({
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          `QUESTION: ${opts.question}`,
          "",
          "DATA:",
          JSON.stringify(data),
        ].join("\n"),
      },
    ],
    temperature: 0.2,
    maxTokens: 700,
  });

  if (!res.ok) {
    return {
      available: false,
      answer: `Assistant indisponible : ${res.message}. Voici les chiffres bruts :\n\n${fallbackAnswer(opts.question, data)}`,
      sources: describeSources(),
    };
  }

  if (opts.userId) {
    const { data: conv } = await sb
      .from("ai_conversations")
      .insert({ user_id: opts.userId, purpose: "admin_query" })
      .select("id")
      .single();
    if (conv) {
      await sb.from("ai_messages").insert([
        { conversation_id: conv.id, role: "user", content: opts.question },
        {
          conversation_id: conv.id,
          role: "assistant",
          content: res.data,
          tokens_input: res.tokensIn ?? null,
          tokens_output: res.tokensOut ?? null,
          latency_ms: res.latencyMs,
        },
      ]);
    }
  }

  return { available: true, answer: res.data, sources: describeSources() };
}

function describeSources() {
  return [
    { key: "v_kpis_daily", label: "KPIs quotidiens (90j)" },
    { key: "v_top_products", label: "Top produits (30j)" },
    { key: "v_top_categories", label: "Top catégories (30j)" },
    { key: "v_stock_alerts", label: "Alertes stock" },
    { key: "v_driver_performance", label: "Performance livreurs" },
    { key: "v_segment_counts", label: "Segments clients" },
  ];
}

function fallbackAnswer(q: string, data: {
  kpis: { last_7d: { revenue: number; orders: number } };
  top_products: { name: string; units: number }[];
  stock_alerts: unknown[];
}): string {
  return [
    `Question : « ${q} »`,
    "",
    `**CA 7 derniers jours** : ${formatDZD(data.kpis.last_7d.revenue)} sur ${data.kpis.last_7d.orders} commandes.`,
    `**Top produit** : ${data.top_products[0]?.name ?? "—"} (${data.top_products[0]?.units ?? 0} unités).`,
    `**Alertes stock** : ${data.stock_alerts.length}.`,
  ].join("\n");
}
