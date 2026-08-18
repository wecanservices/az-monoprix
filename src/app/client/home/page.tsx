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

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 space-y-9 az-mesh">
        {/* Greeting + trust tiles */}
        <section className="space-y-5 az-fade-in-up">
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-[1.1] text-[var(--color-foreground)]">
              {t("hello")}
              {session?.full_name ? (
                <>
                  , <span className="az-display-serif text-[var(--color-primary)]">{session.full_name.split(" ")[0]}</span>
                </>
              ) : (
                " 👋"
              )}
            </h1>
            <p className="text-sm text-[var(--color-foreground-muted)] mt-1.5 leading-relaxed">
              Vos courses, livrées à Lakhdaria en{" "}
              <strong className="text-[var(--color-foreground)] font-bold">2 heures</strong>.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {TRUST_TILES.map((tt, i) => (
              <div
                key={tt.title}
                className="az-trust-tile az-fade-in-up"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <span className="az-trust-tile-icon">
                  <tt.icon className="w-[15px] h-[15px]" strokeWidth={2.2} />
                </span>
                <div className="text-[11px] font-bold leading-tight text-[var(--color-foreground)]">
                  {tt.title}
                </div>
                <div className="text-[9px] text-[var(--color-foreground-muted)] leading-tight">
                  {tt.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hero carousel */}
        <section className="az-fade-in-up" style={{ animationDelay: "200ms" }}>
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

        {/* Foot band CTA — Assistant IA */}
        <section className="az-cta-banner az-fade-in-up flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-white/15 backdrop-blur-sm grid place-items-center shrink-0 shadow-inner border border-white/20 az-pulse-soft">
              <Sparkles className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70 mb-0.5">
                Assistant IA
              </div>
              <div className="font-bold text-[15px] leading-tight text-white">
                Vous ne savez pas quoi acheter&nbsp;?
              </div>
              <div className="text-[12px] text-white/80 leading-snug mt-0.5">
                Décrivez votre besoin, l&apos;IA prépare votre panier.
              </div>
            </div>
          </div>
          <Link
            href="/client/ai-shopping"
            className="shrink-0 self-stretch sm:self-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-[var(--color-primary)] font-bold text-sm px-5 h-11 shadow-[0_8px_20px_-4px_rgb(0_0_0/0.25)] hover:scale-[1.03] active:scale-95 motion-safe:transition-transform"
          >
            Essayer
            <span aria-hidden>→</span>
          </Link>
        </section>

        <ClientFooter />
      </main>
      <AiFab />
    </>
  );
}
