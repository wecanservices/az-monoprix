/**
 * Gemini function-calling loop with SSE streaming.
 *
 * Runs an agentic loop: send messages + tool declarations to Gemini,
 * execute any returned functionCalls locally, feed the results back,
 * and stream the final text tokens.
 *
 * Uses the REST API directly to avoid an SDK dependency and to keep
 * full control over SSE emission.
 */
import "server-only";
import { serverEnv } from "@/config/env";

export type JSONSchema = {
  type: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: string[];
};

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: JSONSchema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolHandler = (args: any) => Promise<unknown>;

export interface ToolRegistry {
  declarations: ToolDeclaration[];
  handlers: Record<string, ToolHandler>;
}

/** One "part" in a Gemini Content — either text or a function call. */
type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | {
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    };

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** Events the chat runner emits as it works. */
export type ChatEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | {
      type: "tool_result";
      name: string;
      summary: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any;
    }
  | { type: "error"; message: string }
  | { type: "done"; tokensIn?: number; tokensOut?: number };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunChatOpts {
  systemInstruction: string;
  history: ChatMessage[];
  userMessage: string;
  tools: ToolRegistry;
  maxToolRounds?: number;
  temperature?: number;
  maxTokens?: number;
}

const MODEL = () => serverEnv?.AI_MODEL ?? "gemini-2.0-flash";
const API_KEY = () => serverEnv?.GEMINI_API_KEY;

/**
 * Runs the tool-calling loop, yielding `ChatEvent`s.
 * The caller pipes them into an SSE stream (or collects them in tests).
 */
export async function* runGeminiChat(opts: RunChatOpts): AsyncGenerator<ChatEvent> {
  const key = API_KEY();
  if (!key) {
    yield { type: "error", message: "Gemini API key not configured" };
    yield { type: "done" };
    return;
  }

  const contents: GeminiContent[] = [];
  for (const m of opts.history) {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }
  contents.push({ role: "user", parts: [{ text: opts.userMessage }] });

  const maxRounds = opts.maxToolRounds ?? 4;
  let tokensIn = 0;
  let tokensOut = 0;

  for (let round = 0; round <= maxRounds; round++) {
    const body = {
      systemInstruction: { parts: [{ text: opts.systemInstruction }] },
      contents,
      tools: [{ functionDeclarations: opts.tools.declarations }],
      generationConfig: {
        temperature: opts.temperature ?? 0.6,
        maxOutputTokens: opts.maxTokens ?? 1024,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent?key=${key}`;
    let raw: Response;
    try {
      raw = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      yield { type: "error", message: `Réseau IA : ${(e as Error).message}` };
      yield { type: "done", tokensIn, tokensOut };
      return;
    }

    if (!raw.ok) {
      const errBody = await raw.text().catch(() => "");
      yield { type: "error", message: `Gemini HTTP ${raw.status}` };
      console.error("[gemini-tools] non-2xx", raw.status, errBody.slice(0, 500));
      yield { type: "done", tokensIn, tokensOut };
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j: any = await raw.json();
    tokensIn += j?.usageMetadata?.promptTokenCount ?? 0;
    tokensOut += j?.usageMetadata?.candidatesTokenCount ?? 0;

    const parts: GeminiPart[] = j?.candidates?.[0]?.content?.parts ?? [];
    if (parts.length === 0) {
      yield { type: "done", tokensIn, tokensOut };
      return;
    }

    // Collect function calls first — Gemini may return several in one turn.
    const calls = parts.filter(
      (p): p is Extract<GeminiPart, { functionCall: unknown }> => "functionCall" in p,
    );

    if (calls.length > 0) {
      // Record the model turn so Gemini has the context on the next round.
      contents.push({ role: "model", parts });

      const responseParts: GeminiPart[] = [];
      for (const call of calls) {
        const { name, args } = call.functionCall;
        yield { type: "tool_call", name, args: args ?? {} };
        const handler = opts.tools.handlers[name];
        let result: unknown;
        let summary = "";
        if (!handler) {
          result = { error: `Unknown tool ${name}` };
          summary = "Outil inconnu";
        } else {
          try {
            result = await handler(args ?? {});
            summary = summarize(name, result);
          } catch (e) {
            result = { error: (e as Error).message };
            summary = `Erreur : ${(e as Error).message}`;
          }
        }
        yield { type: "tool_result", name, summary, data: result };
        responseParts.push({
          functionResponse: {
            name,
            response: {
              // Gemini requires the response to be an object.
              result: result ?? null,
            },
          },
        });
      }

      contents.push({ role: "user", parts: responseParts });
      continue; // next round with tool results in context
    }

    // No function calls → stream the text back to the client.
    const text = parts.map((p) => ("text" in p ? p.text : "")).join("");
    if (text) {
      // Simulated token streaming (single blocking call, but the UI still
      // benefits from an incremental render). Chunks are small so the
      // client can animate them in with minimal jank.
      for (const chunk of chunkText(text, 24)) {
        yield { type: "token", text: chunk };
      }
    }
    yield { type: "done", tokensIn, tokensOut };
    return;
  }

  yield {
    type: "error",
    message: "Trop d'appels d'outils — abandon.",
  };
  yield { type: "done", tokensIn, tokensOut };
}

function chunkText(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

function summarize(name: string, result: unknown): string {
  if (result && typeof result === "object" && "error" in result) {
    return `Erreur : ${(result as { error: string }).error}`;
  }
  if (Array.isArray(result)) {
    return `${result.length} résultat${result.length > 1 ? "s" : ""}`;
  }
  if (result && typeof result === "object") {
    if ("added" in result) return "Ajouté au panier";
    if ("product" in result) return "1 produit trouvé";
    if ("count" in result) {
      const c = (result as { count: number }).count;
      return `${c} résultat${c > 1 ? "s" : ""}`;
    }
  }
  return `Outil ${name} exécuté`;
}
