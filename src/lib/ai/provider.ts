/**
 * AZ MONOPRIX — AI provider abstraction.
 *
 * Supported providers: Google Gemini (default) · Anthropic Claude · OpenAI.
 * Selected by `AI_PROVIDER` env var. If no API key is configured we
 * return a structured "unavailable" response so callers can degrade
 * gracefully instead of crashing.
 */
import "server-only";
import { serverEnv } from "@/config/env";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type AiResult<T> =
  | {
      ok: true;
      data: T;
      raw: string;
      tokensIn?: number;
      tokensOut?: number;
      latencyMs: number;
    }
  | {
      ok: false;
      reason: "not_configured" | "provider_error" | "invalid_json";
      message: string;
    };

export interface RunCompletionOpts<T> {
  messages: AiMessage[];
  json?: boolean;
  parse?: (raw: string) => T;
  temperature?: number;
  maxTokens?: number;
}

type Provider = "gemini" | "anthropic" | "openai";

const PROVIDER = (): Provider => (serverEnv?.AI_PROVIDER ?? "gemini") as Provider;
const MODEL    = () => serverEnv?.AI_MODEL ?? (PROVIDER() === "gemini"
  ? "gemini-2.0-flash"
  : PROVIDER() === "openai"
  ? "gpt-4o-mini"
  : "claude-sonnet-5");

function apiKey(): string | undefined {
  const p = PROVIDER();
  if (p === "openai")    return serverEnv?.OPENAI_API_KEY;
  if (p === "anthropic") return serverEnv?.ANTHROPIC_API_KEY;
  return serverEnv?.GEMINI_API_KEY;
}

export function aiAvailable(): boolean {
  return !!apiKey();
}

export async function runCompletion<T = unknown>(opts: RunCompletionOpts<T>): Promise<AiResult<T>> {
  const key = apiKey();
  if (!key) {
    return { ok: false, reason: "not_configured", message: "AI provider not configured" };
  }
  const start = Date.now();
  try {
    switch (PROVIDER()) {
      case "openai":    return await callOpenAI<T>(opts, key, start);
      case "anthropic": return await callAnthropic<T>(opts, key, start);
      case "gemini":
      default:          return await callGemini<T>(opts, key, start);
    }
  } catch (e) {
    return {
      ok: false,
      reason: "provider_error",
      message: (e as Error).message,
    };
  }
}

/* -------------------- Google Gemini ---------------------- */
async function callGemini<T>(opts: RunCompletionOpts<T>, key: string, start: number): Promise<AiResult<T>> {
  const sys = opts.messages.find((m) => m.role === "system")?.content ?? "";
  const rest = opts.messages.filter((m) => m.role !== "system");
  const body = {
    systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
    contents: rest.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens ?? 1024,
      responseMimeType: opts.json ? "application/json" : "text/plain",
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}: ${await r.text()}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j: any = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return finalize<T>(text, opts, {
    tokensIn: j.usageMetadata?.promptTokenCount,
    tokensOut: j.usageMetadata?.candidatesTokenCount,
    latencyMs: Date.now() - start,
  });
}

/* -------------------- Anthropic Claude ------------------- */
async function callAnthropic<T>(opts: RunCompletionOpts<T>, key: string, start: number): Promise<AiResult<T>> {
  const sys = opts.messages.find((m) => m.role === "system")?.content ?? "";
  const rest = opts.messages.filter((m) => m.role !== "system");
  const body = {
    model: MODEL(),
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.4,
    system: sys,
    messages: rest.map((m) => ({ role: m.role, content: m.content })),
  };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}: ${await r.text()}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j: any = await r.json();
  const text = j.content?.[0]?.text ?? "";
  return finalize<T>(text, opts, {
    tokensIn: j.usage?.input_tokens,
    tokensOut: j.usage?.output_tokens,
    latencyMs: Date.now() - start,
  });
}

/* -------------------- OpenAI ---------------------------- */
async function callOpenAI<T>(opts: RunCompletionOpts<T>, key: string, start: number): Promise<AiResult<T>> {
  const body = {
    model: MODEL(),
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1024,
    response_format: opts.json ? { type: "json_object" } : undefined,
  };
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${await r.text()}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j: any = await r.json();
  const text = j.choices?.[0]?.message?.content ?? "";
  return finalize<T>(text, opts, {
    tokensIn: j.usage?.prompt_tokens,
    tokensOut: j.usage?.completion_tokens,
    latencyMs: Date.now() - start,
  });
}

function finalize<T>(
  text: string,
  opts: RunCompletionOpts<T>,
  meta: { tokensIn?: number; tokensOut?: number; latencyMs: number },
): AiResult<T> {
  try {
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = opts.parse ? opts.parse(clean) : (opts.json ? (JSON.parse(clean) as T) : (clean as unknown as T));
    return { ok: true, data: parsed, raw: text, ...meta };
  } catch (e) {
    return { ok: false, reason: "invalid_json", message: (e as Error).message };
  }
}
