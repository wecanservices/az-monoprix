# AZ Monoprix

Plateforme digitale supermarché — Client · Driver · Super Admin.
Marché : Algérie. Devise : DZD. Langues : Français · العربية · English.

> ✅ **Phases 1 → 8 livrées** — la plateforme couvre le parcours
> complet : catalogue, panier, checkout, livraison GPS, admin ops,
> marketing / fidélité, analytics, IA, hardening.

**Métriques finales** : 85 routes · 190 fichiers TS · 10 migrations SQL · 14/14 tests unitaires passent.

---

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript strict**
- **Tailwind CSS v4** (design tokens via `@theme` + dark mode natif + RTL)
- **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions)
- **next-intl 4** (fr / ar / en)
- **Zod** (validation d'entrée serveur)
- **PostGIS** (zones de livraison, géo)
- **Anthropic / OpenAI** (assistants IA — fallback sans clé)

---

## Démarrage rapide

### Prérequis
- Node 20+ · pnpm 11+ · Docker Desktop · Supabase CLI

### Installation

```bash
pnpm install
cp .env.local.example .env.local
```

### Lancer la base

```bash
pnpm db:start          # démarre Postgres/Auth/Storage local
pnpm db:reset          # applique les 10 migrations + seed catalogue
pnpm db:types          # génère les types TS depuis le schéma
```

Reporter les clés `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
affichées par `supabase start` dans `.env.local`.

### Lancer l'app

```bash
pnpm dev               # http://localhost:3000
```

Ouvrir :
- Client : http://localhost:3000/client/home
- Driver : http://localhost:3000/driver/dashboard (role `driver`)
- Admin  : http://localhost:3000/admin/dashboard (role admin)
- Login  : http://localhost:3000/login
- Studio Supabase : http://localhost:54323

---

## Ce qui marche end-to-end

1. **Découverte** : Home avec catégories + promos + top ventes + smart basket
2. **Recherche** : `/client/search?q=…` full-text
3. **Fiche produit** : image, prix, promo, stock, produits liés
4. **Panier** : ajout optimiste, badge live, code promo (validé serveur), free-shipping
5. **Checkout** : mode (livraison/drive/click&collect) + adresse + créneau + paiement
6. **Commande créée** : `orders`+`order_items`+`inventory_movements` en transaction
7. **Admin prépare** : marque items picked/unavailable → substitutions proposées
8. **Dispatch** : scoring drivers (distance × charge × rating) → assignation 1-clic
9. **Driver** : accepte, avance état par état (GPS live), scanne OTP → livré
10. **Client** : tracking Realtime avec timeline + OTP révélé + notification livreur
11. **Fidélité** : points attribués automatiquement par trigger DB
12. **Réclamation** : ticket support avec conversation bidirectionnelle
13. **Analytics** : dashboard admin avec charts SVG + top produits/catégories/livreurs
14. **IA client** : "Prépare-moi un barbecue pour 6, budget 6000 DA" → panier construit
15. **IA admin** : "Quel produit risque une rupture ?" → réponse ancrée sur `v_stock_alerts`

---

## Documentation

Chaque phase a son doc dédié dans `docs/` :
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — vision d'ensemble + choix structurants
- [`PHASE-1.md`](docs/PHASE-1.md) — fondations + design system
- [`PHASE-2.md`](docs/PHASE-2.md) — catalogue + panier + checkout
- [`PHASE-3.md`](docs/PHASE-3.md) — livraison + GPS + Realtime + substitution
- [`PHASE-4.md`](docs/PHASE-4.md) — admin CRUD complet
- [`PHASE-5.md`](docs/PHASE-5.md) — marketing + fidélité + upload
- [`PHASE-6.md`](docs/PHASE-6.md) — analytics + support + notifications
- [`PHASE-7.md`](docs/PHASE-7.md) — IA (Assistants + Smart Basket + garde-fous)
- [`PHASE-8.md`](docs/PHASE-8.md) — hardening + performance + tests
- [`ROADMAP.md`](docs/ROADMAP.md) — post-livraison

---

## Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur Next.js (Turbopack) |
| `pnpm build` | Build production |
| `pnpm start` | Serveur production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:start` / `db:stop` | Supabase local (Docker) |
| `pnpm db:reset` | Rejoue toutes les migrations |
| `pnpm db:migrate` | Applique migrations en attente |
| `pnpm db:types` | Génère `src/types/database.types.ts` |
| `pnpm db:seed` | Reset + seed dev |
| `pnpm tsx tests/unit/*.test.ts` | Tests unitaires |

---

## Structure

```
src/
├── app/               # Routes App Router
│   ├── client/*       # /client/home, /cart, /checkout, /product, /tracking…
│   ├── driver/*       # /driver/dashboard, /orders, /order/[id]
│   ├── admin/*        # /admin/dashboard, /products, /inventory, /promotions, /ai…
│   ├── (auth)/        # /login, /signup
│   └── api/v1/*       # API REST versionnée
├── components/        # ui/ shared/ client/ driver/ admin/
├── lib/               # supabase/, auth/, i18n/, ai/, security/, logger/, cart/, api/
├── services/          # Métier pur (TS, sans dépendance Next)
│   ├── products/ cart/ checkout/ delivery/ dispatch/ preparation/
│   ├── admin/ (products, inventory, ...)
│   ├── marketing/ (promotions, coupons, banners, slots, loyalty, media)
│   ├── analytics/ support/ notifications/ audit/
│   └── ai/ (shopping, admin, recommendations)
├── hooks/  types/  utils/  config/  constants/
supabase/
├── config.toml
├── migrations/        # 10 fichiers SQL versionnés
└── functions/
locales/               # fr.json · ar.json · en.json
tests/                 # unit/ + integration/ + e2e/
docs/                  # 10 fichiers markdown
```

---

## Sécurité

- **RLS activé sur toutes les tables** — `supabase/migrations/20260817000004_rls.sql`
- Triple couche : RLS Postgres + guards Next `requireCustomer/Driver/Admin` + validation services
- `service_role` **jamais** exposé au navigateur (`lib/supabase/admin.ts` marqué `server-only`)
- Toutes les entrées API validées par Zod
- Headers de sécurité stricts (`X-Frame-Options`, HSTS, Permissions-Policy…)
- Rate limiter in-memory (`lib/security/rate-limit.ts`)
- Audit log centralisé (`services/audit`)
- CSP builder prêt (`lib/security/csp.ts`)

---

## Prêt pour la production ?

**Prêt techniquement** : oui — voir `docs/PHASE-8.md`.
**Prêt commercialement** : voir la section "Ce qui doit être fait avant la prod" dans `docs/ROADMAP.md`.

Les 8 questions ouvertes de l'architecture initiale restent à trancher :
charte graphique définitive · PSP algérien · provider IA · maps · hébergement ·
SMS OTP · wilaya de démarrage · nom de repo.
