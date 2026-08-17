import Link from "next/link";
import { LogOut, MapPin, Heart, Package, Gift, Bell } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function logoutAction() {
  "use server";
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/login");
}

const ITEMS = [
  { href: "/client/orders", icon: Package, label: "Mes commandes" },
  { href: "/client/favorites", icon: Heart, label: "Favoris" },
  { href: "/client/lists", icon: MapPin, label: "Mes adresses" },
  { href: "/client/loyalty", icon: Gift, label: "Programme fidélité" },
  { href: "/client/profile/notifications", icon: Bell, label: "Notifications" },
];

export default async function ProfilePage() {
  const session = await requireCustomer();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-4">
      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white grid place-items-center font-semibold">
          {(session.full_name ?? session.email ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{session.full_name ?? "Client"}</div>
          <div className="text-xs text-[var(--color-foreground-muted)] truncate">{session.email}</div>
        </div>
      </section>

      <ul className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {ITEMS.map(({ href, icon: Icon, label }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 p-4 hover:bg-[var(--color-surface-muted)]">
              <Icon className="w-4 h-4 text-[var(--color-foreground-muted)]" />
              <span className="text-sm font-medium flex-1">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-az-danger)]"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
