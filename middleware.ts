import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * AZ MONOPRIX — Global middleware.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session cookie on every request.
 *  2. Coarse-grained route protection (auth required for /driver, /admin,
 *     and customer areas that need identity).
 *
 * Fine-grained role checks happen in each space's layout via
 * `requireCustomer / requireDriver / requireAdmin`.
 */

const PROTECTED_PREFIXES = [
  "/driver",
  "/admin",
  "/client/checkout",
  "/client/orders",
  "/client/profile",
  "/client/loyalty",
  "/client/favorites",
  "/client/lists",
];

const PUBLIC_ONLY_PREFIXES = ["/login", "/signup", "/otp"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const isPublicOnly = PUBLIC_ONLY_PREFIXES.some((p) => path.startsWith(p));
  if (isPublicOnly && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
