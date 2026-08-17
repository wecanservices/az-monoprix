# Phase 1 — Fondations · ✅ Terminée

Cette phase pose le socle sur lequel toutes les autres reposent :
architecture, database, auth, rôles, design system, layouts, i18n.

---

## Livrables

### 1. Scaffold Next.js
- Next 16 (App Router, Turbopack) + React 19 + TypeScript strict
- Tailwind v4 avec design tokens dans `src/app/globals.css` (`@theme`)
- ESLint, `tsconfig.json` avec alias `@/*`
- Package manager : pnpm 11

### 2. Design system
Fichier : `src/app/globals.css`
- Palette AZ Monoprix (rouge `#E30613` + neutrals + sémantique)
- Support **dark mode** natif (media query + `[data-theme]`)
- Tokens typo, radius, shadow, motion
- Focus visible accessible (contour 2px `--color-primary`)

Composants partagés créés :
- `Logo` · `Money` · `EmptyState` · `PromoBadge`
- `ClientHeader` · `ClientBottomNav`
- `AdminSidebar`

### 3. i18n (fr / ar / en + RTL)
- `next-intl 4` avec `getRequestConfig` dans `src/lib/i18n/request.ts`
- Détection : cookie `az-locale` → `Accept-Language` → `fr` (défaut)
- HTML `dir="rtl"` automatique pour `ar`
- Fichiers `locales/{fr,ar,en}.json` avec les clés de tous les espaces
- Type-safe : `IntlMessages` global inféré depuis `fr.json`

### 4. Supabase
- Clients : `client.ts` (browser), `server.ts` (RSC), `admin.ts` (service_role, `server-only`)
- Middleware `updateSession` pour rafraîchir la session à chaque requête
- Config locale complète (`supabase/config.toml`)

### 5. Base de données (5 migrations)
Fichier | Contenu
--- | ---
`20260817000001_extensions_and_enums.sql` | pgcrypto, pg_trgm, unaccent, postgis + 10 enums (roles, statuts, méthodes)
`20260817000002_schema.sql` | **~45 tables** couvrant identité, catalogue, stores, inventaire, cart, commandes, livraison, marketing, fidélité, paiement, communication, IA, audit
`20260817000003_functions_triggers.sql` | `updated_at`, `handle_new_user` (auto-provision profils), `next_order_number` (AZ-YYYY-NNNNNN), status history, inventory movement application, search vector produits, `is_admin() / is_super_admin()`
`20260817000004_rls.sql` | RLS activé sur **toutes** les tables + politiques par rôle
`20260817000005_seed_wilayas.sql` | 58 wilayas d'Algérie (fr/ar/en) + `loyalty_config` singleton + feature flags

**Vues clés** :
- `stores` séparé de `store_products` (prix par magasin) et `inventory` (stock par magasin) → multi-store natif
- `products` snapshot dans `order_items` → historique fidèle même si le produit change
- `inventory_movements` = journal append-only, `inventory.on_hand/reserved` mis à jour par trigger
- `driver_locations` séparé pour supporter l'écriture haute fréquence + purge

### 6. Rôles & permissions
`src/constants/roles.ts` — miroir de l'enum Postgres `app_role` :
`guest · customer · driver · store_manager · admin · super_admin`

Guards `src/lib/auth/guards.ts` :
`requireAuth · requireCustomer · requireDriver · requireAdmin · requireRole`

Session helper `src/lib/auth/session.ts` :
`getSession()` mémoïsé via React `cache` → un seul appel par requête.

### 7. Auth flows
- `(auth)` route group → `/login`, `/signup`, `/otp`
- Server actions avec validation Zod (`login/actions.ts`, `signup/actions.ts`)
- `/api/v1/auth/callback` pour échange de code (magic link / OAuth)
- Middleware protège `/driver`, `/admin`, `/client/checkout`, `/client/orders`, `/client/profile`, `/client/loyalty`, `/client/favorites`, `/client/lists`

### 8. Layouts
- **Client** (`src/app/client/layout.tsx`) — shell mobile-first, header sticky, bottom nav 5 onglets
- **Driver** (`src/app/driver/layout.tsx`) — mobile-first plein écran, statut ONLINE en topbar, guard `requireDriver`
- **Admin** (`src/app/admin/layout.tsx`) — sidebar desktop 6 sections, topbar user, guard `requireAdmin`
- **Auth** (`src/app/(auth)/layout.tsx`) — carte centrée sur fond neutre

### 9. Pages landing (Phase 1)
Squelettes propres avec `EmptyState` marquant clairement les fonctionnalités des phases suivantes.

- `/client/home` — greeting + bloc IA + 8 sections placeholder
- `/driver/dashboard` — KPIs + missions vides
- `/admin/dashboard` — 4 KPI cards + placeholder analytics

### 10. Configuration
- `.env.local.example` documenté (13 variables)
- `src/config/env.ts` — validation Zod, séparation public / server-only, fail-fast au boot
- Feature flags en DB (`feature_flags` table) : `ai_shopping_assistant`, `ai_admin_assistant`, `live_tracking`, `online_payment`

---

## Vérifications

```bash
pnpm typecheck   # ✅ aucune erreur
pnpm build       # ✅ 8 routes compilent, middleware OK
```

Routes compilées :
```
/                     → redirect selon rôle
/_not-found
/admin/dashboard      (auth + rôle admin)
/api/v1/auth/callback
/client/home
/driver/dashboard     (auth + rôle driver)
/login
/signup
```

---

## Ce que la Phase 1 ne fait PAS (par design)

- Aucun produit affiché (Phase 2)
- Aucun panier fonctionnel (Phase 2)
- Aucune commande créée (Phase 2)
- Aucun tracking GPS (Phase 3)
- Aucun composant shadcn/ui installé (ajouté au fur et à mesure via `npx shadcn add …`)
- Aucun test (P8)
- Aucune donnée seed (juste les wilayas de référence)

---

## Décisions techniques notables

| Sujet | Choix | Alternative écartée | Raison |
|---|---|---|---|
| i18n | next-intl 4 | next-i18next | Support natif App Router, RSC-first |
| Path parameters | `client/…` URL-prefix (dossiers plain) | Route groups `(client)` | Cohérence avec spec utilisateur (URLs `/client/home`) et évite conflits `/dashboard` |
| Types DB | `Database = any` placeholder | Génération immédiate | Nécessite `supabase start` — génération à la première utilisation |
| Multi-store | `store_products` + `inventory` par store | Une table produit avec `stock` global | Extensibilité future indolore |
| Order snapshot | JSON dans `order_items.product_snapshot` | Jointure produits | Audit + historique fidèle si le produit change |
| RLS | Activé partout, exceptions via `service_role` | Vérifications applicatives seules | Triple sécurité (RLS + guards + services) |

---

## Prêt pour Phase 2

Base solide pour construire :
- Catalogue (recherche full-text prête via `products.search_tsv`)
- Panier (tables `carts` + `cart_items` prêtes, support session anonyme)
- Checkout (tables `orders`, `order_items`, `deliveries`, `payments` prêtes)
