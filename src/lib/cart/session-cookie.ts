import "server-only";
import { cookies } from "next/headers";

/**
 * Anonymous cart session tracked in a cookie. The Supabase user id
 * takes precedence — session_id is only read when the user isn't
 * logged in.
 */
export const CART_SESSION_COOKIE = "az-cart-session";

export async function getOrSetSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_SESSION_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(CART_SESSION_COOKIE, id, {
    path: "/",
    httpOnly: false, // read by client-side hook too
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  });
  return id;
}

export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_SESSION_COOKIE)?.value ?? null;
}
