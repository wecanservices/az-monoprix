# AZ Monoprix — Roadmap

## Livré (Phase 1 → 8)

| Phase | Livrable | Statut |
|---|---|---|
| **P1** | Fondations : Next.js + TS + Tailwind + Supabase + Auth + rôles + i18n + design system + 45 tables + RLS partout | ✅ |
| **P2** | Parcours courses : catalogue, panier (anonyme + auth), checkout multi-étapes, orders, seed 45 produits | ✅ |
| **P3** | Livraison & driver : préparation, dispatch scoré, GPS live, OTP, tracking Realtime, substitution | ✅ |
| **P4** | Admin ops : produits (prix multi-store), inventaire, catégories, magasins, drivers (validation), clients (360°) | ✅ |
| **P5** | Marketing & Fidélité : promotions ciblées, coupons validés serveur, loyalty auto au delivered, bannières, upload images Storage | ✅ |
| **P6** | Analytics · Support · Notifications : dashboard réel + charts SVG, top produits/catégories, tickets, notifications in-app, broadcast segment | ✅ |
| **P7** | IA : Assistant Courses (whitelist SKU strict) + Assistant Business (grounded on views) + Smart Basket (co-purchase) — fallback sans API key | ✅ |
| **P8** | Hardening : CSP + security headers, rate limiter, indexes perf, tests unitaires, audit centralisé, docs complètes | ✅ |

**85 routes · 190 TS files · 10 migrations · 14/14 tests passing**

---

## Roadmap post-livraison (ordre suggéré)

### Court terme (0-4 semaines)

**Infrastructure**
- Hébergement production (Vercel + Supabase Cloud)
- CI/CD (GitHub Actions : lint + typecheck + build + tests)
- Monitoring : Sentry côté client + logs Supabase
- Domaine + certificats

**Paiement en ligne**
- Choix PSP : SATIM / CIB / Edahabia (branchement `payments.provider = 'satim' | ...`)
- Route `/api/v1/payments/webhook` avec vérification signature
- Toggle du feature flag `online_payment`

**Compléments UX**
- Redemption points fidélité au checkout (RPC `redeem_loyalty_points` déjà en DB)
- Bandeau bannières actives sur `/client/home` (service `listActiveBanners` prêt)
- Adresses sauvegardées (table `addresses` prête, UI CRUD à ajouter)
- Recherche full-text via `products.search_tsv` (basculement 1-ligne)

### Moyen terme (1-3 mois)

**Multi-store réel**
- Éditeur zones de livraison PostGIS (polygones) → nécessite Mapbox/Google Maps
- Détection auto du magasin par géoloc (`ST_Contains` sur `store_zones.area`)
- Vue "cette semaine" par store manager (RLS déjà scopée)
- Transferts inter-magasins (types `transfer_in`/`transfer_out` déjà en enum)

**Notifications push**
- FCM Web Push (tokens déjà en table `notification_tokens`)
- Envoi automatique aux transitions d'état commande (`orders.status`)
- Envoi à la commande livrée (feedback client)

**Auto-dispatch**
- Cron / Edge Function qui fire quand `orders.status = 'ready'`
- Utilise `available_drivers_for_order` puis assigne le top choice
- Bouton admin "override" reste actif

**Import produits**
- CSV upload via `/admin/products/import`
- Parsing avec Papaparse
- Preview + dry-run + commit

**Application mobile Flutter**
- Consomme l'API `/api/v1/*` existante
- 2 apps : client + driver
- Auth via Supabase Flutter SDK
- Notifications push natives

### Long terme (3-6 mois)

**Marketplace multi-vendors**
- Ajouter `vendor_id` sur `products` et `orders`
- Split paiements (commissions)
- Espace vendor dans admin

**IA avancée**
- Cache des embeddings produits (extension `pgvector`)
- Recherche sémantique côté client
- "Complète la recette" (upload photo → détection produits)
- Prédiction rupture (LLM sur `inventory_movements`)

**Analytics avancés**
- Cohorts (retention par mois d'inscription)
- LTV par segment
- A/B testing sur promotions
- Prévision demande (Prophet / lambda)

**Fidélité avancée**
- Tiers (Silver / Gold / Platinum) — extension du schéma `loyalty_config`
- Rewards catalogue (nouveau type `rewards` table déjà présente)
- Referral program

**Ops**
- Kanban commandes (drag-drop entre statuts)
- Impressions étiquettes (bon de préparation)
- Terminal caisse hors-ligne (retrait Click & Collect)

---

## Ce qui est déjà solide

- **Types stricts partout** — `pnpm typecheck` propre en permanence
- **RLS activé sur toutes les tables** — triple sécurité (RLS + guards + services)
- **Services purs** — réutilisables Flutter, testables sans DB
- **Realtime prêt** — orders + deliveries + driver_locations + order_replacements
- **Audit + Logger + Rate limit** — infra hardening en place
- **Dark mode natif** — tous les composants respectent les tokens
- **RTL prêt** — bascule via cookie `az-locale=ar`
- **AI sans clé** — fallback dégradé, permet de tester le parcours

## Ce qui doit être fait avant la prod

1. Réponses aux 8 questions ouvertes de l'architecture (charte, PSP, IA provider, maps, hébergement, SMS, wilaya, repo name)
2. Comptes production Supabase + secrets réels
3. Politique cookies + CGV/CGU + Mentions légales (routes `/legal/*`)
4. Contact réel + horaires magasin
5. Bandeau consent cookie (aujourd'hui absent)
6. Politique retour + FAQ
7. Sitemap.xml + robots.txt
8. Favicon + icônes app + open graph
