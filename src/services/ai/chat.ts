/**
 * Conversational shopping agent.
 *
 * Wires Gemini tool-calling to real services:
 *   - search_products       → listProducts (search by ILIKE on name_fr)
 *   - get_product_by_barcode
 *   - get_promotions        → listProducts (promotedOnly)
 *   - add_to_cart           → addToCart (source-of-truth price)
 *
 * The LLM never invents products — every product surfaced or added
 * to the cart goes through a validated service call. Tool results are
 * projected to a compact JSON shape so we keep the model's context
 * small and the response fast.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listProducts, getProductByBarcode } from "@/services/products";
import { addToCart, getOrCreateCart } from "@/services/cart";
import { DEFAULT_STORE_ID } from "@/services/stores";
import type {
  ChatEvent,
  ChatMessage,
  ToolRegistry,
} from "@/lib/ai/gemini-tools";
import { runGeminiChat } from "@/lib/ai/gemini-tools";

/** Compact product shape passed to the LLM and rendered as a card. */
export interface ProductCard {
  id: string;
  sku: string;
  name_fr: string;
  price: number;
  promo_price: number | null;
  image_url: string | null;
  unit: string | null;
  on_hand: number;
  category: string | null;
}

export const SYSTEM_PROMPT = `Tu es l'assistant courses AZ Monoprix. Tu aides le client à trouver ses produits parmi les 12 091 références du magasin de Lakhdaria.

Tu peux :
- Chercher le catalogue avec search_products
- Retrouver un produit par code-barre avec get_product_by_barcode
- Lister les promotions du moment avec get_promotions
- Ajouter un produit au panier avec add_to_cart (après confirmation implicite du client)

Règles :
1. N'INVENTE JAMAIS de produit, de prix ni de stock — utilise toujours les outils pour vérifier.
2. Si aucun résultat, propose une reformulation ou une catégorie proche — ne bricole pas de réponse.
3. Reste concis (2 à 3 phrases max), propose au plus 2 ou 3 choix.
4. Réponds en français, ton naturel algérien : "d'accord", "voici", "essayez", évite l'argot.
5. Avant d'ajouter au panier, cite le produit et sa quantité, puis fais l'appel add_to_cart.
6. Quand le stock est faible ou nul, préviens le client.
7. Les prix sont en dinars algériens (DA/DZD).`;

/**
 * Build the tool registry bound to a Supabase client, a store, and a
 * user session. `emitProduct` is called for every product surfaced by
 * a tool so the SSE stream can push mini-cards to the UI.
 */
export function buildShoppingTools(
  sb: SupabaseClient,
  opts: {
    storeId: string;
    userId: string | null;
    sessionId: string | null;
    emitProduct: (p: ProductCard) => void;
  },
): ToolRegistry {
  return {
    declarations: [
      {
        name: "search_products",
        description:
          "Cherche des produits dans le catalogue du magasin par nom (ex : 'yaourt', 'huile olive', 'pain'). Retourne au plus `limit` résultats avec id, nom, prix, prix promo, stock.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Mots-clés en français" },
            limit: {
              type: "integer",
              description: "Nombre max de résultats (défaut 6, max 12)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_product_by_barcode",
        description:
          "Retrouve un produit à partir de son code-barre (EAN-13 / UPC).",
        parameters: {
          type: "object",
          properties: {
            barcode: { type: "string", description: "Code-barre numérique" },
          },
          required: ["barcode"],
        },
      },
      {
        name: "get_promotions",
        description:
          "Liste les produits actuellement en promotion dans le magasin.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              description: "Nombre max de résultats (défaut 8, max 20)",
            },
          },
        },
      },
      {
        name: "add_to_cart",
        description:
          "Ajoute un produit au panier du client. Utilise l'UUID `product_id` renvoyé par search_products ou get_product_by_barcode.",
        parameters: {
          type: "object",
          properties: {
            product_id: {
              type: "string",
              description: "UUID du produit (jamais le SKU ni le nom)",
            },
            quantity: {
              type: "integer",
              description: "Quantité (défaut 1, max 20)",
            },
          },
          required: ["product_id"],
        },
      },
    ],

    handlers: {
      async search_products(args: { query?: string; limit?: number }) {
        const query = String(args?.query ?? "").trim();
        if (query.length < 2) return { error: "query trop courte" };
        const limit = Math.max(1, Math.min(12, Number(args?.limit ?? 6)));
        const rows = await listProducts(sb, {
          storeId: opts.storeId,
          search: query,
          limit,
        });
        const cards = rows.map(rowToCard);
        for (const c of cards) opts.emitProduct(c);
        return { count: cards.length, products: cards };
      },

      async get_product_by_barcode(args: { barcode?: string }) {
        const barcode = String(args?.barcode ?? "").trim();
        if (!barcode) return { error: "barcode requis" };
        const row = await getProductByBarcode(sb, barcode, opts.storeId);
        if (!row) return { found: false };
        const card = rowToCard(row);
        opts.emitProduct(card);
        return { found: true, product: card };
      },

      async get_promotions(args: { limit?: number }) {
        const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 8)));
        const rows = await listProducts(sb, {
          storeId: opts.storeId,
          promotedOnly: true,
          limit,
        });
        const cards = rows.map(rowToCard);
        for (const c of cards) opts.emitProduct(c);
        return { count: cards.length, products: cards };
      },

      async add_to_cart(args: { product_id?: string; quantity?: number }) {
        const productId = String(args?.product_id ?? "").trim();
        if (!productId) return { error: "product_id requis" };
        const quantity = Math.max(1, Math.min(20, Number(args?.quantity ?? 1)));
        try {
          const cart = await getOrCreateCart(sb, {
            customerId: opts.userId,
            sessionId: opts.sessionId,
            storeId: opts.storeId,
          });
          const item = await addToCart(
            sb,
            { id: cart.id, store_id: cart.store_id! },
            productId,
            quantity,
          );
          return {
            added: true,
            product_id: productId,
            quantity: item.quantity,
            unit_price: item.unit_price,
          };
        } catch (e) {
          return { added: false, error: (e as Error).message };
        }
      },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCard(r: any): ProductCard {
  return {
    id: r.id,
    sku: r.sku,
    name_fr: r.name_fr,
    price: Number(r.price ?? r.base_price ?? 0),
    promo_price: r.promo_price != null ? Number(r.promo_price) : null,
    image_url: (r.images ?? [])[0] ?? null,
    unit: r.unit ?? null,
    on_hand: Number(r.on_hand ?? 0),
    category: r.category?.name_fr ?? null,
  };
}

/**
 * Runs one turn of the shopping assistant, yielding SSE-friendly
 * events. The route handler serialises them onto the wire.
 */
export async function* runShoppingChat(
  sb: SupabaseClient,
  opts: {
    userId: string | null;
    sessionId: string | null;
    history: ChatMessage[];
    userMessage: string;
    storeId?: string;
  },
): AsyncGenerator<ChatEvent | { type: "product"; product: ProductCard }> {
  const storeId = opts.storeId ?? DEFAULT_STORE_ID;
  const seenIds = new Set<string>();
  const productBuffer: ProductCard[] = [];

  const tools = buildShoppingTools(sb, {
    storeId,
    userId: opts.userId,
    sessionId: opts.sessionId,
    emitProduct: (p) => {
      if (seenIds.has(p.id)) return;
      seenIds.add(p.id);
      productBuffer.push(p);
    },
  });

  const chat = runGeminiChat({
    systemInstruction: SYSTEM_PROMPT,
    history: opts.history,
    userMessage: opts.userMessage,
    tools,
    maxToolRounds: 4,
    temperature: 0.5,
    maxTokens: 900,
  });

  // Persist the conversation for audit + anti-hallucination review.
  let convId: string | null = null;
  if (opts.userId) {
    const { data: conv } = await sb
      .from("ai_conversations")
      .insert({
        user_id: opts.userId,
        purpose: "shopping",
        context: { store_id: storeId },
      })
      .select("id")
      .single();
    convId = conv?.id ?? null;
    if (convId) {
      await sb.from("ai_messages").insert({
        conversation_id: convId,
        role: "user",
        content: opts.userMessage,
      });
    }
  }

  let assistantText = "";
  const providedSkus: string[] = [];

  for await (const evt of chat) {
    // Flush any queued products before the next event so the client
    // sees them alongside the tool_result they came from.
    while (productBuffer.length > 0) {
      const p = productBuffer.shift()!;
      providedSkus.push(p.sku);
      yield { type: "product", product: p };
    }
    if (evt.type === "token") assistantText += evt.text;
    yield evt;
  }

  if (convId) {
    await sb.from("ai_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: assistantText,
      provided_skus: providedSkus,
    });
  }
}
