import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ROLES } from "@/constants/roles";

/**
 * Root landing — routes users to the right space based on role.
 * Guests land on the client home (public shopping is allowed).
 */
export default async function RootPage() {
  const session = await getSession();
  const role = session?.role ?? ROLES.GUEST;

  switch (role) {
    case ROLES.DRIVER:
      redirect("/driver/dashboard");
    case ROLES.ADMIN:
    case ROLES.SUPER_ADMIN:
    case ROLES.STORE_MANAGER:
      redirect("/admin/dashboard");
    default:
      redirect("/client/home");
  }
}
