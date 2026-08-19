import Link from "next/link";
import {
  LogOut,
  MapPin,
  Heart,
  Package,
  Gift,
  Bell,
  LifeBuoy,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getCustomerLoyalty, getLoyaltyConfig } from "@/services/marketing/loyalty";
import { LoyaltyCard } from "@/components/client/loyalty-card";

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
  { href: "/client/ai-shopping", icon: Sparkles, label: "Assistant IA courses" },
  { href: "/client/chat", icon: LifeBuoy, label: "Aide & Support" },
  { href: "/client/profile/notifications", icon: Bell, label: "Notifications" },
];

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireCustomer();
  const sb = await createClient();
  const [loyalty, cfg] = await Promise.all([
    getCustomerLoyalty(sb, session.id),
    getLoyaltyConfig(createAdminClient()),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-4">
      {/* Header profil */}
      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-4 flex items-center gap-3 shadow-[var(--shadow-elev-1)]">
        <div
          className="w-12 h-12 rounded-full text-white grid place-items-center font-black text-lg shadow-[var(--shadow-glow-red)]"
          style={{ background: "var(--gradient-cta)" }}
        >
          {(session.full_name ?? session.email ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">
            {session.full_name ?? "Client"}
          </div>
          <div className="text-xs text-[var(--color-foreground-muted)] truncate">
            {session.email}
          </div>
        </div>
      </section>

      {/* Carte fidélité compacte + lien vers la carte complète */}
      <Link
        href="/client/loyalty"
        aria-label="Ma carte fidélité"
        className="block motion-safe:transition-transform motion-safe:duration-[var(--duration-base)] motion-safe:ease-[var(--ease-out-back)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-[24px]"
      >
        <LoyaltyCard
          customerId={session.id}
          customerName={session.full_name}
          balance={loyalty.balance}
          lifetimeEarned={loyalty.lifetime_earned}
          dzdPerPoint={cfg.dzd_per_point}
          compact
        />
        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--color-foreground-muted)] uppercase tracking-widest">
          <Gift className="w-3 h-3" />
          Voir ma carte complète
          <ChevronRight className="w-3 h-3" />
        </div>
      </Link>

      {/* Menu */}
      <ul className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)] shadow-[var(--shadow-elev-1)] overflow-hidden">
        {ITEMS.map(({ href, icon: Icon, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 p-4 hover:bg-[var(--color-surface-muted)] motion-safe:transition-colors"
            >
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                <Icon className="w-4 h-4" strokeWidth={2.2} />
              </span>
              <span className="text-sm font-semibold flex-1">{label}</span>
              <ChevronRight className="w-4 h-4 text-[var(--color-foreground-muted)]" />
            </Link>
          </li>
        ))}
      </ul>

      {/* Logout */}
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-az-danger)] hover:bg-[var(--color-az-danger)]/5 motion-safe:transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
