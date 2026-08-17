/**
 * Application-level roles. Stored in `profiles.role`.
 * Mirrored on the DB as a Postgres enum (`app_role`).
 */
export const ROLES = {
  GUEST: "guest",
  CUSTOMER: "customer",
  DRIVER: "driver",
  STORE_MANAGER: "store_manager",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles that can access the admin space. */
export const ADMIN_ROLES: readonly Role[] = [
  ROLES.STORE_MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

export function isAdminRole(role: Role | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}
