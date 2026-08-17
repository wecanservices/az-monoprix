"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3x3, ShoppingCart, ClipboardList, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CartBadge } from "./cart-badge";

const ITEMS = [
  { href: "/client/home", icon: Home, key: "home" as const },
  { href: "/client/categories", icon: Grid3x3, key: "categories" as const },
  { href: "/client/cart", icon: ShoppingCart, key: "cart" as const, badge: true },
  { href: "/client/orders", icon: ClipboardList, key: "orders" as const },
  { href: "/client/profile", icon: User, key: "profile" as const },
];

export function ClientBottomNav() {
  const t = useTranslations("nav");
  const path = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, icon: Icon, key, badge }) => {
          const active =
            path === href || (href !== "/" && path.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
                )}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
                  {badge && <CartBadge />}
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
