# Phase 4 — Admin opérationnel · ✅ Terminée

Cette phase donne à l'admin la maîtrise complète du catalogue,
des stocks, des magasins, des livreurs et des clients.

---

## Livrables

### 1. Services admin — `src/services/admin/*`
- **`products.ts`** : `adminListProducts`, `adminGetProduct`, `adminUpsertProduct`, `adminSetStorePrice`, `adminToggleProductActive`
- **`inventory.ts`** : `adminListInventory`, `adminAdjustStock`, `adminListMovements`
- **`index.ts`** : `adminListCategories/Brands/Stores/Drivers/Customers`, `adminUpsertCategory/Store`, `adminMakeUserDriver`, `adminSetDriverVerified`, `adminGetCustomer`
- Tous purs TS, cohérents avec les tables gérées par les triggers Phase 1

### 2. API — `/api/v1/admin/*`
| Route | Verbe | Objet |
|---|---|---|
| `/products` | GET · POST | Liste (search, category) · upsert |
| `/products/[id]` | GET · PATCH | Détail · toggle active / set store price |
| `/inventory` | GET · POST | Liste stocks · ajustement (crée un `inventory_movement`) |
| `/categories` | POST | Upsert |
| `/categories/[id]` | DELETE | Supprimer |
| `/stores` | POST | Upsert |
| `/drivers/[id]/verify` | POST | Valider / révoquer |

### 3. Composants admin réutilisables
- `PageHeader` (titre + description + actions)
- `DataCard` (surface neutre)
- `ToggleSwitch` (optimistic switch avec revert)

### 4. UI Admin livrées

**Produits** (`/admin/products`)
- Liste avec recherche + filtre catégorie
- Colonne prix (venant de `store_products` si défini, sinon `base_price`) et stock (dispo)
- Badge Actif/Inactif
- `/admin/products/new` — formulaire complet
- `/admin/products/[id]` — édition + panneau **Prix & disponibilité par magasin**
  - Prix par store, promo, disponibilité éditable ligne par ligne
  - Affichage automatique du pourcentage de réduction

**Inventaire** (`/admin/inventory`)
- Sélecteur de magasin
- Filtre "Stock faible" (≤ low_stock)
- Colonnes : Stock physique · Réservé · Disponible
- `StockAdjuster` inline : +/- 1 en un clic OU delta + raison libre
- Panneau latéral : **Derniers mouvements** (20 derniers) avec type, quantité, acteur, timestamp

**Catégories** (`/admin/categories`)
- Éditeur inline : icône + slug + nom + position
- Ajouter / éditer / supprimer une catégorie sans quitter la page

**Magasins** (`/admin/stores`)
- Édition en place : code, nom, wilaya (dropdown 58), adresse, téléphone, horaires, statut
- Ajout d'un nouveau magasin (multi-store dès aujourd'hui)

**Livreurs** (`/admin/drivers`)
- Section **En attente de validation** en haut
- Bouton **Valider** / **Révoquer** (`/api/v1/admin/drivers/[id]/verify`)
- Table livreurs validés avec statut, note, nombre de livraisons

**Clients** (`/admin/customers`)
- Recherche par nom/email/téléphone
- `/admin/customers/[id]` — vue 360° : commandes totales, dépense cumulée, points fidélité, membre depuis + historique commandes

---

## Vérifications

```bash
pnpm typecheck   # ✅
pnpm build       # ✅ 54 routes
```

**+17 routes** vs Phase 3 :
- 9 pages admin (products list/new/[id], inventory, categories, stores, drivers, customers list/[id])
- 8 API admin

---

## Décisions techniques Phase 4

| Sujet | Choix | Alternative écartée | Raison |
|---|---|---|---|
| Ajustement stock | Passe par `inventory_movements` (trigger applique) | `UPDATE inventory.on_hand` direct | Journal append-only + audit garanti |
| Prix par magasin | Panneau dédié dans la fiche produit | Colonne dans la liste | Meilleure ergonomie multi-store, encourage l'usage explicite |
| Édition inline (catégories, magasins) | Édition dans la table | Modal séparée | Moins de clics pour l'opérationnel |
| Validation drivers | Action séparée, statut `is_verified` | Auto-approbation | Sécurité opérationnelle (vérification papiers) |
| Client 360° | Page dédiée avec historique | Table listant tout | KPIs + drilldown = analyse rapide |
| Toggle actif produit | Endpoint `PATCH` avec `action:"set_active"` | `PUT` full row | Explicite, atomique, extensible |

---

## Ce que la Phase 4 ne fait PAS

- **Import CSV** produits (à ajouter avec Papaparse quand demandé)
- **Upload d'images produits** (Storage Supabase branché mais UI absente — Phase 5)
- **Éditeur de zones** (polygones PostGIS) — Phase 5
- **Éditeur de créneaux** par magasin — Phase 5 (les seed sont utilisés en attendant)
- **Kanban** commandes → prochaine itération avec drag-drop
- **Filtre commandes par magasin** — le `role='store_manager'` limite déjà via RLS ; UI dédiée en P5
- **Export CSV** (analytics) — Phase 6

---

## Comment tester

```bash
pnpm db:start && pnpm db:reset && pnpm dev
# Créer un compte + UPDATE profiles SET role='admin' WHERE email='...'
# Ouvre http://localhost:3000/admin/dashboard
```

Scénarios rapides :
1. **Créer un produit** : `/admin/products/new` → remplir → sauvegarder → apparaît dans `/client/home` après un `revalidate` (60 s ou refresh)
2. **Ajuster un stock** : `/admin/inventory` → +/- ou delta custom → mouvement enregistré, visible dans le panneau latéral
3. **Nouveau magasin** : `/admin/stores` → ajouter → visible dans les prix par magasin de chaque produit
4. **Valider un livreur** : `/admin/drivers` → **Valider** dans la section en attente → apparaît dans le pool `/driver/orders`
5. **Vue client** : `/admin/customers` → cliquer un client → KPIs + commandes

---

## Prêt pour Phase 5

Base solide pour :
- Créer/éditer **promotions** ciblées (produits liés déjà en table)
- Gérer les **coupons** (code, valeur, plafond, dates)
- Configurer les **règles de fidélité** (`loyalty_config` singleton) + attribution automatique de points au checkout
- Éditer les **zones de livraison** avec un picker de polygones
- **Éditer les créneaux** par magasin
- Éditeur d'images produits (upload Storage)
