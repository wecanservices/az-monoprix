# Phase 6 — Analytics · Support · Notifications · ✅ Terminée

Cette phase transforme le dashboard admin en tableau de bord de
pilotage réel et donne au client un canal support persistant.

## Livrables

### 1. Migration `20260817000009_analytics_views.sql`
6 vues **read-only** utilisées par le dashboard ET l'assistant IA admin :
- `v_kpis_daily` — CA / commandes / panier moyen (90 jours)
- `v_top_products` — top 50 (30j)
- `v_top_categories` — top 20 (30j)
- `v_stock_alerts` — `on_hand ≤ low_stock` OU `available ≤ 0`
- `v_driver_performance` — livraisons, revenus, temps moyen
- `v_customer_segments` — segmentation RFM-lite (nouveau · actif · fidèle · vip · inactif)
- `v_segment_counts` — agrégat pour bandeaux admin

`GRANT SELECT` accordé à `authenticated` — filtrage par RLS métier sur les tables sources.

### 2. Services `src/services/{analytics,support,notifications}`
- `analytics/` : `getKpiSummary`, `getTopProducts/Categories`, `getStockAlerts`, `getDriverPerformance`, `getSegmentCounts`, `getCustomersBySegment`
- `support/` : `createTicket`, `listCustomerTickets`, `adminListTickets`, `getTicket`, `addTicketMessage`, `updateTicketStatus`
- `notifications/` : `createNotification`, `listUserNotifications`, `countUnread`, `markRead`, `broadcastToSegment`

### 3. API
| Route | Verbe | Objet |
|---|---|---|
| `/admin/analytics/summary` | GET | Bundle complet dashboard |
| `/support/tickets` | POST | Client crée un ticket |
| `/support/tickets/[id]/messages` | POST | Ajouter message + optionnel `status` |
| `/notifications` | GET · POST | Liste + tout marquer lu |
| `/admin/broadcast` | POST | Envoyer à un segment (créé notifications in-app) |

### 4. UI Admin
- **`/admin/dashboard`** entièrement refait : 4 KPI tiles + `MiniChart` SVG (30j CA/commandes) + segments + Top produits/catégories + panneau alertes stock
- **`/admin/analytics`** : 2 mini-charts (CA + commandes/j) + tableaux top produits/catégories/livreurs
- **`/admin/support`** : liste filtrable par statut + **`/admin/support/[id]`** conversation temps réel avec changement de statut
- **`/admin/marketing`** : ajout d'un composer **Broadcast segment** (envoie à N clients d'un coup)
- **`/admin/finance`** : totaux paiements bruts/encaissés/en attente + tableau derniers paiements + remboursements

### 5. UI Client
- **`NotificationBell`** dans le header client (dropdown avec badge unread, mark all read)
- **`/client/chat`** : liste tickets + **nouveau ticket** (modal 4-en-1 avec catégorie + sujet + description)
- **`/client/chat/[id]`** : conversation bidirectionnelle avec envoi de réponse

## Composants créés
`MiniChart` (SVG inline, aucune dépendance) · `NotificationBell` · `BroadcastForm` · `TicketConversation` (admin) · `ClientTicketReply` · `NewTicketButton`

## Vérifications
```bash
pnpm typecheck   # ✅
pnpm build       # ✅
```

**Nouvelles routes P6 : +13** (5 pages admin + 3 pages client + 5 API).

## Décisions techniques
- **Charts sans lib** : `MiniChart` = SVG scalable, aucune dépendance. Suffit largement pour les KPIs sparkline-style.
- **Analytics via vues** : le même contrat de données sert le dashboard humain ET l'IA (P7). Pas de duplication de logique.
- **Broadcast** : matérialise une notification in-app par utilisateur du segment. Le push FCM est stubbé — activer dans P8+ en branchant un `sendPush` provider.
- **Ticket API unifié** : même endpoint pour client & admin messages, la sécurité vient de la RLS + du guard côté API.
