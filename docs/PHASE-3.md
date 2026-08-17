# Phase 3 — Livraison & Driver · ✅ Terminée

Cette phase ferme la boucle logistique : préparation → assignation →
livraison GPS → preuve OTP → tracking client Realtime.

---

## Livrables

### 1. Migration `20260817000007_delivery_helpers.sql`
- **`gen_delivery_otp()`** — génère un code à 4 chiffres
- **Trigger `tg_orders_on_ready`** — crée la ligne `deliveries` + OTP dès qu'une commande passe `ready`
- **`geo_distance_km(a, b)`** — haversine wrapper (PostGIS)
- **`available_drivers_for_order(orderId)`** — RPC qui score les drivers en ligne (distance + charge − rating)
- **Realtime** activé sur `orders`, `order_status_history`, `order_items`, `order_replacements`, `deliveries`, `driver_locations`
- **`transition_order_status()`** — RPC unifiée pour toute transition de statut avec `actor_id`

### 2. State machine — `src/services/delivery/state-machine.ts`
Source unique de vérité pour les transitions autorisées, par acteur (`system` · `customer` · `driver` · `admin`).
- `canTransition(from, to, actor)` : guard côté API
- `driverNextActions(status)` : dérive les boutons UI

### 3. Services (`src/services/delivery/`, `dispatch/`, `preparation/`)
- **`delivery/`** : `listDriverMissions`, `listAvailableMissions`, `assignDriver`, `acceptMission`, `refuseMission`, `advanceMission`, `completeDelivery` (OTP + `pick` inventory), `pushDriverLocation`, `setDriverStatus`
- **`dispatch/`** : `rankDriversForOrder` (proxy sur la fonction SQL)
- **`preparation/`** : `listOrdersToPrepare`, `loadOrderForPrep`, `markItem`, `startPreparation`, `finishPreparation`, `respondReplacement`

### 4. API `/api/v1/*`
| Route | Verbe | Objet |
|---|---|---|
| `/driver/orders` | GET | Mes missions + pool disponibles |
| `/driver/orders/[id]/accept` | POST | Claim d'une mission |
| `/driver/orders/[id]/refuse` | POST | Renvoi au pool |
| `/driver/orders/[id]/status` | PATCH | Transition (avec OTP pour `delivered`) |
| `/driver/location` | POST | GPS ping OU toggle online/offline |
| `/admin/orders/[id]/assign` | GET/POST | Ranking + assignation manuelle |
| `/admin/orders/[id]/prepare` | POST | `start` / `finish` / `mark_item` (picked, unavailable, replacement) |
| `/orders/[id]/replacement` | POST | Client répond accept/reject/refund |

### 5. Driver UI
- **Layout** : topbar avec `OnlineToggle` (POST `/driver/location`)
- **`/driver/dashboard`** : KPIs (livraisons du jour, revenus, note) + mission active
- **`/driver/orders`** : sections **Mes missions** + **Missions disponibles**
- **`/driver/order/[id]`** : détail stops (magasin/client) + articles + notes + action bar
  - Component `MissionActions` : `Accepter/Refuser` (pool) → boutons contextuels par status → OTP input pour finaliser
  - Component `GpsTracker` : `navigator.geolocation.watchPosition` throttlé (1 ping / 8s) — actif uniquement pendant la mission

### 6. Live tracking client — `/client/tracking/[id]`
- Timeline 6 étapes (mappe les 15 statuts DB vers 6 phases lisibles)
- **Subscription Realtime** aux tables `orders` + `deliveries` via canal `order:{id}`
- Affichage nom du livreur (récupéré dès qu'il est assigné)
- **Code OTP** révélé au client quand la commande passe en `picked_up`
- Composant `ReplacementProposals` : affiche les propositions de remplacement en attente + boutons Accepter / Refuser / Rembourser

### 7. Admin ops
- **`/admin/orders`** : liste + filtres (pending, preparing, ready, picked_up, delivered) + colonnes statut/mode
- **`/admin/orders/[id]`** : `PreparationPanel` (marquer picked/unavailable par item, démarrer/finir la prépa) + `DispatchPanel` (candidats classés + assignation 1-clic)
- **`/admin/delivery`** : vue temps réel — livreurs en ligne + courses en cours

### 8. Workflow rupture / substitution
1. Préparateur clique la croix ❌ sur un item pendant la prépa
2. Si un `replacementProductId` est passé, une ligne `order_replacements` est créée
3. Quand la commande passe à `ready` avec au moins un item indispo → statut `partially_available` (au lieu de `ready`)
4. Le client voit `ReplacementProposals` sur `/client/tracking/[id]` (via Realtime)
5. Client répond → `order_replacements.customer_response = accepted|rejected|refunded`

---

## Vérifications

```bash
pnpm typecheck   # ✅
pnpm build       # ✅ 37 routes
```

**+13 routes** vs Phase 2 :
- 3 pages driver (`orders`, `order/[id]`, `dashboard` retooled)
- 1 client (`tracking/[id]`)
- 3 admin (`orders`, `orders/[id]`, `delivery`)
- 6 API (`driver/*`, `admin/orders/[id]/prepare`, `assign`, `orders/[id]/replacement`)

---

## Décisions techniques Phase 3

| Sujet | Choix | Alternative écartée | Raison |
|---|---|---|---|
| Transitions de statut | RPC SQL `transition_order_status` + guard TS `canTransition` | Directement UPDATE dans les services | Symétrie : la SQL centralise le log historique + guard TS empêche skip côté UI |
| Dispatch scoring | Fonction Postgres `available_drivers_for_order` | Scoring TS côté API | Admin UI + futur Edge Function partagent la même source ; l'index géo travaille à ~1ms |
| Assignation | Manuelle depuis admin (1-clic sur "Recommandé") | Auto-dispatch au passage `ready` | Sécurité opérationnelle : humain valide en Phase 3, auto en P4 |
| OTP | 4 chiffres révélés au client à `picked_up` | 6 chiffres, envoi SMS séparé | Simplicité + SMS branché plus tard sans casser l'UX |
| GPS driver | `watchPosition` browser, ping 1/8s | Background job natif | Web-first ; le futur wrapper Flutter fera la même chose avec plus de fond |
| Realtime tracking | Canal `order:{id}` avec `postgres_changes` | Server-sent events sur route custom | Zéro backend supplémentaire, publication déjà activée |
| Substitution flow | Table `order_replacements` + réponse client | Chat direct préparateur ↔ client | Traçable, audit, réversible, sans dépendance chat |

---

## Ce que la Phase 3 ne fait PAS (par design)

- **Auto-dispatch** sans intervention admin (branchement trivial via cron/edge quand demandé)
- **Cartes** interactives (Mapbox/Google) — remplacé par lien "Ouvrir dans Maps" côté driver et timeline lisible côté client. Pré-requis : token dans `.env.local`
- **Notifications push** (FCM/Web Push) — Realtime remplit temporairement le rôle
- **Signature** manuelle (canvas) — la photo suffit en Phase 3
- **Preuve refus / adresse inaccessible** — bouton "problème" sera ajouté en P6 (support)
- **Recalcul du total** après substitution — l'écart est gelé jusqu'à un remboursement manuel (P4 finance)

---

## Comment tester le parcours complet

```bash
pnpm db:start
pnpm db:reset       # applique les 7 migrations dont delivery_helpers
pnpm dev
```

Dans **Supabase Studio** (`http://localhost:54323`) crée trois comptes :
1. Un **client** (signup depuis l'app)
2. Un **driver** : signup + dans Studio, `UPDATE profiles SET role='driver' WHERE email='...'` + `INSERT INTO drivers(id, is_verified) VALUES('<user_id>', true);`
3. Un **admin** : signup + `UPDATE profiles SET role='admin' WHERE email='...';`

Puis :

1. **Client** ajoute des produits, passe commande (`/client/checkout`)
2. **Admin** → `/admin/orders/[id]` → **Démarrer la préparation** → optionnel : marquer un item ❌ → **Marquer prête**
3. **Trigger** crée automatiquement `deliveries` + OTP
4. **Driver** passe **En ligne** (top-bar) → **`/driver/orders`** → voit la mission dans le pool → **Accepter**
5. Suivre les boutons : `Je pars au magasin` → `Je suis au magasin` → `Colis récupéré` → `Je pars chez le client` → `Je suis chez le client`
6. **Client** voit chaque étape en temps réel sur `/client/tracking/[id]` — l'OTP apparaît à `picked_up`
7. Driver saisit l'OTP → livraison marquée → mouvement d'inventaire `pick` créé → `orders.status = delivered`

---

## Prêt pour Phase 4

Le socle opérationnel est complet. La Phase 4 pourra :
- Gérer produits/stocks/magasins en masse (CRUD + import CSV)
- Vue commandes filtrée par magasin (`store_manager` role est déjà en place)
- Feed livreurs (créer/valider un compte driver depuis l'admin)
- Signaler et rembourser (workflow support)
