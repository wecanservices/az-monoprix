# Architecture — AZ Monoprix

Voir la spec complète validée dans la conversation initiale. Ce fichier
récapitule les décisions structurantes et les invariants du projet.

---

## Principes directeurs

1. **Panier-first, pas livraison-first** — le panier est un agrégat racine.
2. **Multi-store dès J1** — toute donnée stock/prix/commande a un `store_id`.
3. **Backend = source de vérité** — prix, stock, promos, fidélité calculés serveur.
4. **IA sur données réelles** — retrieval strict, jamais d'invention de SKU/stat.
5. **Mobile-first client/driver, desktop-first admin**.
6. **Préparer Flutter** — `/services` en TypeScript pur, API `/api/v1/*` versionnée.

---

## Vue macro

```
┌─────────────────────────────────────────────────────────────┐
│  Client Web · Driver Web · Admin Web   ← Next.js (1 codebase)│
│  (futur : Flutter mobile client + driver via /api/v1)        │
└──────────────────────────────┬───────────────────────────────┘
                               ▼
                    /api/v1/*  (REST, Zod, JWT)
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
     Services              Realtime               Edge/Cron
   (métier pur)           (channels)             (dispatch)
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               ▼
                          SUPABASE
     Postgres (RLS) · Auth · Storage · Realtime · Edge Fn
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
     Mapbox                  FCM/Push              LLM (IA)
```

---

## Espaces

| Espace | URL | Layout | Guard | Cible |
|---|---|---|---|---|
| **Client** | `/client/*` | Mobile-first, bottom nav | Public (guest OK), auth pour checkout/orders/profile | Consommateur final |
| **Driver** | `/driver/*` | Mobile-first, topbar statut | `requireDriver` | Livreur |
| **Admin** | `/admin/*` | Desktop-first, sidebar | `requireAdmin` | Manager magasin · Admin · Super admin |
| **Auth** | `/login`, `/signup`, `/otp` | Carte centrée | Redirect si déjà connecté | Tous |
| **API** | `/api/v1/*` | Route handlers Next | JWT + Zod + RLS | Web + Flutter futur |

---

## Rôles

Enum PG `app_role` mirroré dans `src/constants/roles.ts` :
```
guest · customer · driver · store_manager · admin · super_admin
```

Chaîne de vérification :
1. **Middleware** (`middleware.ts`) — auth requise sur prefixes protégés
2. **Layout guards** (`requireCustomer / requireDriver / requireAdmin`)
3. **RLS Postgres** — filtre par `auth.uid()` + `is_admin()` / `is_super_admin()`

---

## Base de données

Domaines et tables principales (voir `supabase/migrations/`) :

- **Identité** : `profiles`, `customers`, `drivers`
- **Géo Algérie** : `wilayas`, `communes`
- **Multi-store** : `stores`, `store_zones` (PostGIS), `store_slots`
- **Catalogue** : `categories`, `brands`, `products`, `product_images`, `product_tags`
- **Prix/stock local** : `store_products` (prix par magasin), `inventory`, `inventory_movements`
- **Client features** : `addresses`, `favorites`, `shopping_lists`, `reviews`
- **Panier** : `carts` (support session anonyme), `cart_items`
- **Commandes** : `orders`, `order_items`, `order_status_history`, `order_replacements`
- **Livraison** : `deliveries`, `driver_locations` (haute fréquence), `delivery_proofs`
- **Marketing** : `promotions`, `coupons`, `coupon_redemptions`, `banners`, `campaigns`
- **Fidélité** : `loyalty_config` (singleton), `loyalty_accounts`, `loyalty_transactions`
- **Paiements** : `payments`, `refunds`, `driver_wallets`, `driver_wallet_transactions`
- **Comm** : `notifications`, `notification_tokens`, `chat_conversations`, `chat_messages`, `support_tickets`, `ticket_messages`
- **IA** : `ai_conversations`, `ai_messages`, `ai_feedback` (audit anti-hallucination via `provided_skus`)
- **Système** : `audit_log`, `settings`, `feature_flags`

---

## Order state machine

```
pending → confirmed → preparing → [partially_available] → ready
                                                              │
                                                              ▼
                                                        assigned → accepted →
                                                        go_to_store → at_store →
                                                        picked_up →
                                                        go_to_customer → at_customer →
                                                        delivered

Terminaux : delivered · cancelled · refunded
```

Toute transition insère une ligne dans `order_status_history` via trigger.

---

## Inventory model

`inventory` = état courant (`on_hand`, `reserved`, `low_stock`).
`inventory_movements` = journal append-only.

Un trigger applique automatiquement chaque mouvement sur `inventory` :

| Type | Effet |
|---|---|
| `receive`, `return`, `transfer_in`, `adjust(+)` | `on_hand +=` |
| `pick`, `transfer_out`, `loss` | `on_hand -=` |
| `reserve` | `reserved +=` |
| `release`, `pick` | `reserved -=` |

`available = on_hand - reserved`.

---

## AI garde-fous

- L'LLM ne voit **jamais** de SKU en dehors du set fourni en contexte.
- Les SKUs fournis sont enregistrés dans `ai_messages.provided_skus`.
- Validation serveur : chaque SKU renvoyé doit exister dans `products` et être `is_active`.
- Assistant admin : text-to-SQL restreint à des **vues** (read-only).

---

## Prochaine évolution

Voir les fichiers de phase pour chaque itération :
- [`docs/PHASE-1.md`](PHASE-1.md) — fondations (✅ fait)
- Phase 2 → catalogue + panier + checkout
- Phase 3 → livraison + driver + GPS
- Phase 4 → admin ops
- Phase 5 → marketing / fidélité
- Phase 6 → analytics / support
- Phase 7 → IA
- Phase 8 → hardening
