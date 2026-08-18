/**
 * SSE endpoint for the conversational shopping assistant.
 *
 *   POST /api/v1/ai/chat
 *   body: { message: string, history?: {role, content}[] }
 *
 * Streams events as `data: <json>\n\n` per the SSE convention. Event
 * shapes match `services/ai/chat.ts` — see that module for the tool
 * loop and the `ProductCard` payload.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { getOrSetSessionId } from "@/lib/cart/session-cookie";
import { runShoppingChat } from "@/services/ai/chat";
import { fail } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return fail("bad_request", "Invalid body", 400, parsed.error.flatten());

  const session = await getSession();
  const sessionId = session ? null : await getOrSetSessionId();
  const sb = createAdminClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const evt of runShoppingChat(sb, {
          userId: session?.id ?? null,
          sessionId,
          history: parsed.data.history ?? [],
          userMessage: parsed.data.message,
        })) {
          send(evt);
        }
      } catch (e) {
        send({ type: "error", message: (e as Error).message });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
