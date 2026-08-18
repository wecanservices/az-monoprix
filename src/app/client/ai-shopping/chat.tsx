"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, ShoppingCart, Search, Tag, Loader2 } from "lucide-react";
import { ProductImage } from "@/components/shared/product-image";
import { PriceTag } from "@/components/shared/price-tag";
import { cn } from "@/lib/utils";

/**
 * Conversational shopping chat — talks to /api/v1/ai/chat over SSE,
 * renders assistant tokens as they stream, and surfaces product cards
 * whenever a tool call returns catalogue rows.
 */

interface ProductCard {
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

interface ToolBubble {
  name: string;
  status: "running" | "done" | "error";
  summary?: string;
}

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
  tools?: ToolBubble[];
  at: number;
  streaming?: boolean;
}

const QUICK_PROMPTS = [
  { icon: Search, label: "Trouve-moi un yaourt", prompt: "Trouve-moi un yaourt nature" },
  { icon: Tag, label: "Y a-t-il des promos ?", prompt: "Quelles sont les promotions du moment ?" },
  {
    icon: ShoppingCart,
    label: "Panier de la semaine",
    prompt: "Prépare-moi un panier basique pour la semaine (produits essentiels).",
  },
];

export function AiShoppingChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the bottom as new tokens / products arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const applyEvent = useCallback((id: string, evt: SseEvent) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        switch (evt.type) {
          case "token":
            return { ...m, content: m.content + evt.text };
          case "product": {
            const products = m.products ?? [];
            if (products.some((p) => p.id === evt.product.id)) return m;
            return { ...m, products: [...products, evt.product] };
          }
          case "tool_call": {
            const tools = m.tools ?? [];
            return {
              ...m,
              tools: [...tools, { name: evt.name, status: "running" }],
            };
          }
          case "tool_result": {
            const tools = m.tools ?? [];
            const last = [...tools].reverse().find(
              (t) => t.name === evt.name && t.status === "running",
            );
            if (!last) return m;
            const updated = tools.map((t) =>
              t === last ? { ...t, status: "done" as const, summary: evt.summary } : t,
            );
            return { ...m, tools: updated };
          }
          case "error":
            return {
              ...m,
              content:
                (m.content ? m.content + "\n\n" : "") +
                `⚠️ ${evt.message}`,
            };
          case "done":
            return m;
          default:
            return m;
        }
      }),
    );
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setInput("");

      const userMsg: Msg = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        at: Date.now(),
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Msg = {
        id: assistantId,
        role: "assistant",
        content: "",
        products: [],
        tools: [],
        at: Date.now(),
        streaming: true,
      };

      // Snapshot history for the server (LLM context).
      const history = messages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const resp = await fetch("/api/v1/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });
        if (!resp.ok || !resp.body) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events: each event is a `data: <json>\n\n` frame.
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!frame.startsWith("data:")) continue;
            const payload = frame.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload) as SseEvent;
              applyEvent(assistantId, evt);
            } catch {
              // ignore malformed frames
            }
          }
        }
      } catch (e) {
        applyEvent(assistantId, {
          type: "error",
          message: (e as Error).message,
        });
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
        setBusy(false);
      }
    },
    [busy, messages, applyEvent],
  );

  async function addProductToCart(product: ProductCard) {
    setAddingId(product.id);
    try {
      const r = await fetch("/api/v1/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (!r.ok) throw new Error("échec ajout");
    } finally {
      setAddingId(null);
    }
  }

  const hasConversation = messages.length > 0;
  const canSend = input.trim().length > 0 && !busy;

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--client-header,4rem)-6rem)] min-h-[520px]">
      {/* Message log */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-1 pb-4 space-y-4 scroll-smooth"
      >
        {!hasConversation && <EmptyState onPick={send} />}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            msg={m}
            addingId={addingId}
            onAdd={addProductToCart}
            onOpenCart={() => router.push("/client/cart")}
          />
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-foreground-muted)] pl-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>L&apos;assistant prépare la suite…</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="pt-2">
        <div className="flex items-end gap-2 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)] px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--color-primary)]/40 transition">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(120, el.scrollHeight) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Demandez-moi n'importe quoi — « du yaourt à la vanille »"
            disabled={busy}
            className="flex-1 resize-none bg-transparent text-sm px-1 py-2 outline-none placeholder:text-[var(--color-foreground-muted)] max-h-32"
          />
          <button
            onClick={() => send(input)}
            disabled={!canSend}
            aria-label="Envoyer"
            className={cn(
              "h-10 w-10 rounded-full grid place-items-center transition-all",
              canSend
                ? "bg-[var(--color-primary)] text-white shadow-md hover:scale-105 active:scale-95"
                : "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]",
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Message bubble ---------------- */

function MessageBubble({
  msg,
  addingId,
  onAdd,
  onOpenCart,
}: {
  msg: Msg;
  addingId: string | null;
  onAdd: (p: ProductCard) => void;
  onOpenCart: () => void;
}) {
  const isUser = msg.role === "user";
  const time = useMemo(() => formatTime(msg.at), [msg.at]);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] space-y-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 pl-1 text-[10px] uppercase tracking-wider text-[var(--color-foreground-muted)]">
            <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
            Assistant AZ
          </div>
        )}

        {(msg.content.length > 0 || msg.streaming) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
              isUser
                ? "bg-[var(--color-az-red-50)] text-[var(--color-foreground)] rounded-br-md"
                : "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-bl-md",
            )}
          >
            {msg.content || (msg.streaming ? <StreamingDots /> : null)}
          </div>
        )}

        {msg.tools && msg.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {msg.tools.map((t, i) => (
              <ToolChip key={i} tool={t} />
            ))}
          </div>
        )}

        {msg.products && msg.products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {msg.products.map((p) => (
              <ProductMiniCard
                key={p.id}
                p={p}
                busy={addingId === p.id}
                onAdd={() => onAdd(p)}
                onOpenCart={onOpenCart}
              />
            ))}
          </div>
        )}

        <div
          className={cn(
            "text-[10px] text-[var(--color-foreground-muted)]",
            isUser ? "text-right pr-1" : "pl-1",
          )}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-4">
      <span className="w-1.5 h-1.5 bg-[var(--color-foreground-muted)] rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-[var(--color-foreground-muted)] rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-[var(--color-foreground-muted)] rounded-full animate-bounce" />
    </span>
  );
}

function ToolChip({ tool }: { tool: ToolBubble }) {
  const label = TOOL_LABELS[tool.name] ?? tool.name;
  const running = tool.status === "running";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border",
        running
          ? "bg-[var(--color-az-info-soft)] border-[var(--color-az-info)]/30 text-[var(--color-az-info)]"
          : "bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-foreground-muted)]",
      )}
    >
      {running ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-az-success)]" />
      )}
      <span className="font-medium">{label}</span>
      {tool.summary && !running && (
        <span className="opacity-70">· {tool.summary}</span>
      )}
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  search_products: "Recherche catalogue",
  get_product_by_barcode: "Lecture code-barre",
  get_promotions: "Promotions du jour",
  add_to_cart: "Ajout au panier",
};

function ProductMiniCard({
  p,
  busy,
  onAdd,
  onOpenCart,
}: {
  p: ProductCard;
  busy: boolean;
  onAdd: () => void;
  onOpenCart: () => void;
}) {
  const outOfStock = p.on_hand <= 0;
  return (
    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 flex gap-2 items-center">
      <ProductImage
        productName={p.name_fr}
        sku={p.sku}
        src={p.image_url}
        className="w-14 h-14 rounded-lg shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold line-clamp-2 leading-snug">
          {p.name_fr}
        </div>
        {p.category && (
          <div className="text-[10px] text-[var(--color-foreground-muted)] truncate">
            {p.category}
          </div>
        )}
        <PriceTag price={p.price} promoPrice={p.promo_price} size="sm" unit={p.unit} />
      </div>
      <button
        onClick={outOfStock ? undefined : busy ? onOpenCart : onAdd}
        disabled={outOfStock}
        className={cn(
          "shrink-0 h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1 transition",
          outOfStock
            ? "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)] cursor-not-allowed"
            : busy
              ? "bg-[var(--color-az-success)] text-white"
              : "bg-[var(--color-primary)] text-white active:scale-95",
        )}
      >
        {outOfStock ? (
          "Rupture"
        ) : busy ? (
          <>
            <ShoppingCart className="w-3 h-3" /> Voir
          </>
        ) : (
          <>
            <ShoppingCart className="w-3 h-3" /> Ajouter
          </>
        )}
      </button>
    </div>
  );
}

/* ---------------- Empty state ---------------- */

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="pt-8 space-y-4 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-az-red-50)] grid place-items-center">
        <Sparkles className="w-6 h-6 text-[var(--color-primary)]" />
      </div>
      <div className="space-y-1">
        <div className="text-base font-semibold">
          Comment puis-je vous aider aujourd&apos;hui ?
        </div>
        <div className="text-xs text-[var(--color-foreground-muted)]">
          Cherchez, comparez, ajoutez au panier — dites-moi ce qu&apos;il vous faut.
        </div>
      </div>
      <div className="flex flex-col gap-2 max-w-md mx-auto pt-2">
        {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => onPick(prompt)}
            className="w-full text-left inline-flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:shadow-sm transition"
          >
            <span className="w-8 h-8 rounded-full grid place-items-center bg-[var(--color-surface-muted)] text-[var(--color-primary)] shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/* ---------------- SSE event types ---------------- */

type SseEvent =
  | { type: "token"; text: string }
  | { type: "product"; product: ProductCard }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; summary: string; data: unknown }
  | { type: "error"; message: string }
  | { type: "done"; tokensIn?: number; tokensOut?: number };
