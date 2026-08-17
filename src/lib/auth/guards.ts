/**
 * Route-level guards for Server Components and layouts.
 * Redirect if the current user's role doesn't match.
 */
import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionProfile } from "./session";
import { ROLES, ADMIN_ROLES, type Role } from "@/constants/roles";

/** Require an authenticated user (any role except guest). */
export async function requireAuth(redirectTo = "/login"): Promise<SessionProfile> {
  const session = await getSession();
  if (!session || session.role === ROLES.GUEST) redirect(redirectTo);
  return session;
}

/** Require the customer role. */
export async function requireCustomer(): Promise<SessionProfile> {
  const session = await requireAuth();
  if (session.role !== ROLES.CUSTOMER) redirect("/");
  return session;
}

/** Require the driver role. */
export async function requireDriver(): Promise<SessionProfile> {
  const session = await requireAuth();
  if (session.role !== ROLES.DRIVER) redirect("/");
  return session;
}

/** Require any admin role (store_manager | admin | super_admin). */
export async function requireAdmin(): Promise<SessionProfile> {
  const session = await requireAuth();
  if (!ADMIN_ROLES.includes(session.role)) redirect("/");
  return session;
}

/** Require a specific role. */
export async function requireRole(role: Role): Promise<SessionProfile> {
  const session = await requireAuth();
  if (session.role !== role) redirect("/");
  return session;
}
