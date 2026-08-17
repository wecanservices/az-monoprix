# Phase 2 — Parcours courses · ✅ Terminée

Cette phase active le cœur commercial : découvrir → chercher → choisir →
ajouter au panier → passer commande.

---

## Livrables

### 1. Seed dev — `supabase/migrations/20260817000006_seed_dev_catalog.sql`
- **1 magasin** : AZ Monoprix — Bab Ezzouar
- **12 catégories** (fruits & légumes, viandes, laitiers, épicerie, boissons, hygiène, maison, bébé, animalerie…)
- **10 marques** (Soummam, Candia, Cevital, Ifri, Ramy, Coca-Cola, Nestlé, Maggi, Danone, producteur local)
- **~45 produits** DZD réalistes avec unité, poids, prix, descriptions
- **store_products** (prix par magasin) — 10 produits en promo -15%
- **inventory** — stock 100 pour tous les produits
- **35 créneaux** de livraison (5 slots × 7 jours)
- **3 bannières** + 2 codes promo (SEMAINE15, BIENVENUE)

### 2. Services métier (`src/services/*`)
- **`services/types.ts`** — types domaine (Product, StoreProduct, Cart, CartItem, DeliverySlot…)
- **`services/products/`** — `listProducts`, `getProductById`, `listCategories`, `getCategoryBySlug`
- **`services/stores/`** — `listStores`, `getDefaultStore`
- **`services/cart/`** — `getOrCreateCart`, `addToCart`, `updateCartItemQuantity`, `removeCartItem`, `clearCart`, `mergeSessionCart`
- **`services/cart/totals.ts`** — calcul pur `computeTotals`
- **`services/delivery/slots.ts`** — génération des créneaux disponibles + `slotIsoRange`
- **`services/checkout/`** — `placeOrder` (transaction multi-tables)

Tous en TypeScript pur (aucune dépendance Next.js) → **réutilisables Flutter via API v1**.

### 3. API `/api/v1/*`
| Route | Verbe | Objet |
|---|---|---|
| `/catalog/products` | GET | Recherche + filtres (categorySlug, search, featured, promoted, limit, offset) |
| `/catalog/categories` | GET | Liste des catégories actives |
| `/cart` | GET | Panier courant (customer OU session anonyme) |
| `/cart/items` | POST | Ajouter un produit |
| `/cart/items/[itemId]` | PATCH · DELETE | Modifier quantité · supprimer |
| `/checkout/quote` | POST | Prévisualisation totals + créneaux |
| `/checkout/place` | POST | Créer la commande (transaction) |
| `/auth/callback` | GET | Échange code OAuth |

Toutes utilisent :
- Validation **Zod** systématique
- Format uniforme `{ data, error, meta }`
- Codes d'erreur internes (`bad_request`, `unauthorized`, `db_error`…)

### 4. Support panier anonyme
- Cookie `az-cart-session` (UUID, 60 jours)
- Bascule automatique vers cart authentifié à la connexion (`mergeSessionCart`)
- Anonyme → API utilise `admin` client (RLS bypass) via `session_id`
- Authentifié → API utilise `server` client (RLS actif) via `customer_id`

### 5. Composants UI
`components/shared/` : `PriceTag` · `ProductImage` (fallback emoji) · `PromoBadge` · `SectionHeader` · `HScroll` · `CategoryChip`
`components/client/` : `ProductCard` (grid + wide) · `AddToCartButton` (optimiste, transitions) · `CartBadge` (live) · `CartItemRow`

### 6. Pages livrées
| Route | Contenu |
|---|---|
| `/client/home` | Greeting, bloc IA, chips catégories, carrousels promotions/top ventes/populaires |
| `/client/categories` | Grille 2 colonnes des catégories |
| `/client/categories/[slug]` | Produits d'une catégorie |
| `/client/search?q=...` | Recherche server-side (ILIKE nom_fr) |
| `/client/product/[id]` | Fiche : image, prix, description, specs, produits liés, CTA sticky |
| `/client/cart` | Items éditables, free-shipping hint, totals, CTA sticky |
| `/client/checkout` | Mode (delivery/drive/pickup) · Adresse · Slot · Paiement (COD) · Notes · Confirmation |
| `/client/orders` | Historique |
| `/client/orders/[id]` | Détail commande + banner "confirmée" |
| `/client/profile` | Menu + logout server action |

---

## Vérifications

```bash
pnpm typecheck   # ✅ aucune erreur
pnpm build       # ✅ 24 routes compilées
```

Nouvelles routes (vs Phase 1) : **+16** (7 client + 6 API + 2 orders + 1 profile).

---

## Décisions techniques Phase 2

| Sujet | Choix | Alternative écartée | Raison |
|---|---|---|---|
| Cart anonyme | Cookie UUID + service_role côté serveur | JWT anonyme Supabase | Simplicité, pas de flow de conversion complexe |
| Placement de commande | `service_role` inline dans `/checkout/place` | Postgres function `place_order()` | Vitesse d'itération. Migration prévue P3 pour transactionnalité stricte |
| Recherche | ILIKE `name_fr` en Phase 2 | Full-text `search_tsv` immédiat | ILIKE couvre le seed. `search_tsv` déjà indexé (Phase 1), branchement 1-ligne quand jugé nécessaire |
| Images produits | Fallback emoji (icône catégorie) | Placeholders génériques | Design plus cohérent avant l'upload de vraies images |
| Cart totals | Recalculés serveur ET client | Serveur uniquement | UX (feedback instantané) — serveur reste source de vérité |
| Free shipping | Hardcodé 3000 DZD | Table `settings` | À migrer dans `settings` en P5 marketing |

---

## Ce que la Phase 2 ne fait PAS (par design)

- **Coupons** appliqués au checkout (P5 marketing)
- **Points fidélité** attribués à la commande (P5)
- **Assignation driver** automatique (P3)
- **Live tracking** GPS (P3)
- **Substitution** en cas de rupture pendant préparation (P3)
- **Paiement en ligne** SATIM/Edahabia/CIB (branchement PSP en P4)
- **Réclamation** post-livraison (P6)
- **Recommandations IA** panier (P7)

---

## Comment tester le parcours

```bash
# 1. Démarrer Supabase local
pnpm db:start

# 2. Rejouer toutes les migrations (dont le seed catalogue)
pnpm db:reset

# 3. Générer les types DB (une seule fois après un nouveau schéma)
pnpm db:types

# 4. Copier les clés affichées par `db:start` dans .env.local
#    (NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY)

# 5. Lancer l'app
pnpm dev
```

Puis :
1. Ouvre http://localhost:3000/client/home → catalogue visible
2. Ajoute quelques produits au panier (bouton +) → badge s'incrémente
3. Va sur /client/cart → items éditables
4. Clique "Passer la commande" → redirigé vers /login si non connecté
5. Crée un compte via /signup
6. Retour au checkout → choisis mode, slot, paiement → confirme
7. Redirigé vers /client/orders/[id] → commande créée !

Vérifie dans Supabase Studio (http://localhost:54323) :
- Table `orders` : nouvelle ligne avec `order_number` `AZ-2026-000001`
- Table `order_items` : lignes avec `product_snapshot`
- Table `inventory_movements` : `reserve` pour chaque item
- Table `payments` : ligne `pending` en `cash_on_delivery`

---

## Prêt pour Phase 3

Base solide pour :
- **Assignation driver** — tables `deliveries`, `driver_locations` prêtes
- **Préparation** — statuts d'ordre déjà en place, remplacer un item = 1 UPDATE
- **Live tracking** — Realtime channel `order:{id}` à câbler
- **Preuve de livraison** — table `delivery_proofs` prête, il reste l'upload photo + OTP
