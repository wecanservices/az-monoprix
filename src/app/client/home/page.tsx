import Link from "next/link";
import { Sparkles, Truck, Gift, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ClientHeader } from "@/components/client/client-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeader } from "@/components/shared/section-header";
import { HScroll } from "@/components/shared/hscroll";
import { CategoryChip } from "@/components/shared/category-chip";
import { HeroCarousel } from "@/components/shared/hero-carousel";
import { ProductCard } from "@/components/client/product-card";
import { ClientFooter } from "@/components/client/footer";
import { AiFab } from "@/components/client/ai-fab";
import { getSession } from "@/lib/auth/session";
import { createReadServerClient } from "@/lib/supabase/anon-server";
import { listCategories, listProducts } from "@/services/products";
import { DEFAULT_STORE_ID } from "@/services/stores";
import type { Category, StoreProduct } from "@/services/types";

export const revalidate = 60;

const HERO_SLIDES = [
  { src: "/banners/hero-ai.svg", href: "/client/ai-shopping", alt: "Assistant IA courses" },
  { src: "/banners/hero-fresh.svg", href: "/client/categories/fruits-legumes", alt: "Frais et local" },
  { src: "/banners/hero-ramadan.svg", href: "/client/promotions", alt: "Ramadan -30%" },
  { src: "/banners/hero-drive.svg", href: "/client/checkout", alt: "Service Drive" },
  { src: "/banners/hero-loyalty.svg", href: "/client/loyalty", alt: "Programme fidélité" },
];

const TRUST_TILES = [
  { icon: Zap, title: "Livraison 2h", desc: "sur Lakhdaria" },
  { icon: Truck, title: "Drive", desc: "sans descendre" },
  { icon: Gift, title: "1 DA = 1 point", desc: "fidélité auto" },
  { icon: Sparkles, title: "Assistant IA", desc: "ton panier prêt" },
];

export default async function ClientHomePage() {
  const t = await getTranslations("client.home");
  const session = await getSession();

  let categories: Category[] = [];
  let featured: StoreProduct[] = [];
  let promoted: StoreProduct[] = [];
  let popular: StoreProduct[] = [];
  let dbUp = true;

  try {
    const sb = createReadServerClient();
    [categories, featured, promoted, popular] = await Promise.all([
      listCategories(sb),
      listProducts(sb, { storeId: DEFAULT_STORE_ID, featuredOnly: true, limit: 12 }),
      listProducts(sb, { storeId: DEFAULT_STORE_ID, promotedOnly: true, limit: 12 }),
      listProducts(sb, { storeId: DEFAULT_STORE_ID, limit: 12 }),
    ]);
  } catch {
    dbUp = false;
  }

  return (
    <>
      <div className="az-marquee">
        🚚 Livraison offerte dès 3 000 DA · Lakhdaria &amp; environs
      </div>
      <ClientHeader />

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 space-y-8 az-mesh">
        {/* Greeting + trust tiles */}
        <section className="space-y-4 az-fade-in">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {t("hello")}
              {session?.full_name ? `, ${session.full_name.split(" ")[0]}` : " 👋"}
            </h1>
            <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">
              Vos courses, livrées à Lakhdaria en <strong className="text-[var(--color-foreground)]">2 heures</strong>.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {TRUST_TILES.map((tt) => (
              <div key={tt.title} className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2 text-center">
                <tt.icon className="w-4 h-4 mx-auto text-[var(--color-primary)]" />
                <div className="text-[10px] font-bold mt-1 leading-tight">{tt.title}</div>
                <div className="text-[9px] text-[var(--color-foreground-muted)] leading-tight">{tt.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Hero carousel */}
        <section className="az-fade-in">
          <HeroCarousel slides={HERO_SLIDES} />
        </section>

        {!dbUp && (
          <EmptyState
            title="Base de données non disponible"
            description="Lance `pnpm db:start` puis `pnpm db:reset`."
          />
        )}

        {/* Categories */}
        {dbUp && categories.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              eyebrow="Nos rayons"
              title="Explorez le magasin"
              href="/client/categories"
            />
            <HScroll>
              {categories.map((c) => (
                <CategoryChip key={c.id} category={c} />
              ))}
            </HScroll>
          </section>
        )}

        {/* Promotions carousel */}
        {dbUp && promoted.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              eyebrow="Ne les manquez pas"
              title="Promotions"
              href="/client/promotions"
            />
            <HScroll>
              {promoted.map((p) => (
                <ProductCard key={p.id} product={p} variant="wide" />
              ))}
            </HScroll>
          </section>
        )}

        {/* Featured grid */}
        {dbUp && featured.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              eyebrow="Les préférés du magasin"
              title="Best sellers"
            />
            <div className="grid grid-cols-2 gap-3">
              {featured.slice(0, 6).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Populaires */}
        {dbUp && popular.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              eyebrow="Ça marche fort"
              title="Populaires cette semaine"
            />
            <div className="grid grid-cols-2 gap-3">
              {popular.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Foot band CTA */}
        <section className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--gradient-hero)] grid place-items-center shrink-0 shadow-[var(--shadow-glow-red)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold">Vous ne savez pas quoi acheter ?</div>
            <div className="text-xs text-[var(--color-foreground-muted)]">
              Décrivez votre besoin, l'assistant IA prépare votre panier.
            </div>
          </div>
          <Link href="/client/ai-shopping" className="az-btn-primary text-sm shrink-0 whitespace-nowrap">
            Essayer
          </Link>
        </section>

        <ClientFooter />
      </main>
      <AiFab />
    </>
  );
}
