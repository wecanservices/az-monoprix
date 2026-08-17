"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  Store,
  Truck,
  Users,
  Tag,
  Ticket,
  Gift,
  BarChart3,
  Megaphone,
  Wallet,
  Sparkles,
  Settings,
  LifeBuoy,
  Grid3x3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

const NAV = [
  {
    section: "Opérations",
    items: [
      { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Commandes", icon: ShoppingBag },
      { href: "/admin/delivery", label: "Livraisons", icon: Truck },
      { href: "/admin/drivers", label: "Livreurs", icon: Users },
    ],
  },
  {
    section: "Catalogue",
    items: [
      { href: "/admin/products", label: "Produits", icon: Package },
      { href: "/admin/categories", label: "Catégories", icon: Grid3x3 },
      { href: "/admin/inventory", label: "Inventaire", icon: Boxes },
      { href: "/admin/stores", label: "Magasins", icon: Store },
    ],
  },
  {
    section: "Croissance",
    items: [
      { href: "/admin/promotions", label: "Promotions", icon: Tag },
      { href: "/admin/coupons", label: "Coupons", icon: Ticket },
      { href: "/admin/loyalty", label: "Fidélité", icon: Gift },
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytique", icon: BarChart3 },
      { href: "/admin/finance", label: "Finance", icon: Wallet },
      { href: "/admin/ai", label: "Assistant IA", icon: Sparkles },
    ],
  },
  {
    section: "Client",
    items: [
      { href: "/admin/customers", label: "Clients", icon: Users },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    section: "Système",
    items: [
      { href: "/admin/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] hidden lg:flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)]">
        <Logo size="sm" />
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-primary)]">
          Admin
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-sm">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-foreground-muted)]">
              {group.section}
            </div>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = path === href || path.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md transition",
                        active
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                          : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
