# Phase 5 — Marketing & Fidélité · ✅ Terminée

Cette phase active la boucle commerciale : promotions ciblées,
coupons validés serveur, fidélité attribuée automatiquement,
bannières éditables et upload d'images produits en direct.

---

## Livrables

### 1. Migration `20260817000008_loyalty_and_storage.sql`
- **Trigger `tg_orders_award_loyalty`** — attribue automatiquement `points = subtotal_net × points_per_dzd` quand une commande passe à `delivered`, met à jour `loyalty_accounts.balance/lifetime_earned`, log dans `loyalty_transactions`
- **RPC `redeem_loyalty_points()`** — décrémente le solde avec vérification (raise si insuffisant)
- **Storage bucket `product-images`** — public read, admin write, MIME whitelist (png/jpeg/webp/gif), 5 MB max
- Policies RLS ajoutées idempotemment

### 2. Services marketing (`src/services/marketing/*`)
- **`promotions.ts`** : CRUD + `adminSetPromotionProducts` (delete + insert, produits liés)
- **`coupons.ts`** : CRUD + **`evaluateCoupon`** (validation complète : actif, dates, min_order, max_redemptions global, per_customer_limit) — utilisé à la fois par le panier et par `placeOrder`
- **`banners.ts`** : CRUD + `listActiveBanners` filtré par dates
- **`slots.ts`** : CRUD créneaux par magasin
- **`loyalty.ts`** : `getLoyaltyConfig`, `updateLoyaltyConfig`, `getCustomerLoyalty` (balance + historique)
- **`media.ts`** : `createProductImageUploadUrl` (signed URL) + `attachProductImage`

### 3. Intégration checkout
`src/services/checkout/index.ts` :
- Re-évalue le coupon **côté serveur** (jamais le prix envoyé par le client)
- Applique `discount` sur les totaux
- Insère `coupon_redemptions` avec `amount_off` réel
- Livraison offerte (`free_shipping`) → `deliveryFee = 0`

### 4. API `/api/v1/*`
| Route | Verbe | Objet |
|---|---|---|
| `/admin/promotions` | POST | Upsert + set produits liés |
| `/admin/promotions/[id]` | DELETE | Supprimer |
| `/admin/coupons` | POST | Upsert |
| `/admin/banners` | POST · DELETE | CRUD |
| `/admin/slots` | POST · DELETE | CRUD |
| `/admin/loyalty-config` | POST | Modifier les règles |
| `/admin/upload` | POST | `action:"sign"` (signed URL) OU `action:"attach"` (crée `product_image`) |
| `/cart/coupon` | POST · DELETE | Appliquer / retirer coupon |

### 5. UI Admin livrées
- **`/admin/promotions`** — liste + création + édition + liaison produits multi-select searchable
- **`/admin/coupons`** — éditeur inline complet (code, type, valeur, min, max_redemptions, per_customer_limit, actif, redemptions_count)
- **`/admin/loyalty`** — règles éditables + **Top 20 des clients fidèles** classés par `lifetime_earned`
- **`/admin/marketing`** — éditeur de bannières (URL + titre + lien + position + actif)
- **Panneau images** dans `/admin/products/[id]` — upload direct vers Storage (Client → Storage → serveur pour attacher), preview inline

### 6. UI Client livrées
- **`CouponInput`** dans `/client/cart` — appliquer un code, voir la réduction, retirer
- **`/client/loyalty`** — hero card avec solde + valeur DZD, règles visibles, historique 30 transactions

---

## Vérifications

```bash
pnpm typecheck   # ✅
pnpm build       # ✅ 69 routes
```

**+15 routes** vs Phase 4 :
- 7 API (`/admin/{promotions,coupons,banners,slots,loyalty-config,upload}` + `/cart/coupon`)
- 8 pages (`/admin/promotions` liste + new + [id], `/admin/coupons`, `/admin/loyalty`, `/admin/marketing`, `/admin/promotions/[id]` DELETE route, `/client/loyalty`)

---

## Décisions techniques Phase 5

| Sujet | Choix | Alternative écartée | Raison |
|---|---|---|---|
| Attribution fidélité | Trigger Postgres sur `delivered` | Job app-side | Zéro délai + jamais oublié si un ordre est marqué delivered hors UI |
| Redemption points | RPC `redeem_loyalty_points` avec `FOR UPDATE` | UPDATE + INSERT séparés | Transaction + verrou, pas de solde négatif possible |
| Validation coupon | Serveur uniquement (`evaluateCoupon`) | Calcul client + trust | Sécurité — le client n'est jamais autorité |
| Upload images | Signed URL Storage → PUT direct → attach | Multipart via Next server | Bandwidth + mémoire — le serveur ne voit jamais les bytes |
| Bucket public read | `public: true` | Signed URLs à chaque affichage | Simplicité pour catalogue, images non sensibles |
| Bannières | URL image texte libre | Upload obligatoire | Souple (lien externe accepté) + upload dans même flow |
| Éditeur promos ↔ produits | Multi-select searchable | Table de liaison éditable ligne par ligne | Ergonomique pour 500+ produits |
| Loyalty config | Table `loyalty_config` singleton (`id = true`) | `settings` JSON | Types stricts + trigger utilise des colonnes réelles |

---

## Ce que la Phase 5 ne fait PAS

- **Redemption points au checkout** — le calcul serveur est prêt (RPC), mais la Case UI est laissée à P7 (assistant IA proposera aussi)
- **Segments clients** (nouveaux / actifs / VIP) — SQL prêt mais UI en P6 avec les analytics
- **Éditeur de zones** (polygones PostGIS) — nécessite Mapbox ou équivalent (voir questions ouvertes)
- **Éditeur de créneaux** — API `/admin/slots` prête, UI à ajouter (recyclage du pattern éditeur inline)
- **Push notifications** — table `notification_tokens` prête, FCM branchement en P6
- **Réduction du panier affichée aux items** — la réduction est appliquée globalement (pas de bundle par item pour l'instant)
- **DELETE d'image produit** côté serveur — le bouton retire du DOM uniquement (route DELETE à ajouter avec suppression du blob Storage)

---

## Test manuel du parcours P5

```bash
pnpm db:start && pnpm db:reset && pnpm dev
```

**Coupon** :
1. Admin `/admin/coupons` → créer `TEST10` (percentage, 10, actif)
2. Client `/client/cart` avec des items → saisir `TEST10` → voir la réduction
3. Passer commande → vérifier `coupon_redemptions` + `orders.discount_total`

**Fidélité** :
1. Admin `/admin/loyalty` → ajuster `points_per_dzd` (par ex. 1.5) → enregistrer
2. Client passe commande → livrée par le driver → **automatiquement** `loyalty_transactions` + `loyalty_accounts.balance` incrémentés
3. Client `/client/loyalty` → solde + historique visible

**Bannière** :
1. Admin `/admin/marketing` → ajouter bannière avec URL image publique + link `/client/promotions` → position 1
2. `/client/home` — la section promo prend la bannière (à câbler au besoin, le service `listActiveBanners` est prêt)

**Image produit** :
1. Admin `/admin/products/[id]` → panneau **Images** → cliquer **Ajouter** → sélectionner un JPG
2. Le fichier va directement dans Supabase Storage (`product-images/{productId}/…`) → attach automatique → visible dans le catalogue client après revalidate

---

## Prêt pour Phase 6

Base solide pour **Analytics · Support · Réclamations** :
- Toutes les données sont déjà là (`orders`, `loyalty_transactions`, `coupon_redemptions`, `inventory_movements`)
- Vues matérialisées peuvent être ajoutées pour dashboards en temps réel
- `support_tickets` + `ticket_messages` existent depuis P1 → il ne reste que l'UI
- `campaigns` table prête pour push segmenté
