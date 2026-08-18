"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3x3, ShoppingCart, ClipboardList, User } from "lucide-react";
import { useTranslations } from "next-intl";
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
    <nav className="az-bottom-nav">
      <ul className="mx-auto max-w-3xl grid grid-cols-5 gap-1">
        {ITEMS.map(({ href, icon: Icon, key, badge }) => {
          const active =
            path === href || (href !== "/" && path.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                data-active={active}
                className="az-nav-item"
                aria-current={active ? "page" : undefined}
              >
                <span className="az-nav-icon-wrap relative">
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.4 : 1.8} />
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
