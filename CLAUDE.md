# AZ Monoprix — Notes pour Claude

## Contexte
Plateforme digitale supermarché — client · driver · super admin.
Marché Algérie (DZD, wilayas, RTL arabe).
**Totalement indépendante de BENNA** — ne pas réutiliser sa logique.

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4
Supabase (Postgres + Auth + Storage + Realtime, RLS partout)
next-intl 4 (fr/ar/en, RTL pour ar) · Zod · PostGIS

## Structure clé
- `src/app/client/*`, `src/app/driver/*`, `src/app/admin/*` — 3 espaces URL-prefixés
- `src/app/(auth)/*` — route group (auth) → URLs `/login`, `/signup`, `/otp`
- `src/services/*` — logique métier pure TypeScript (réutilisable Flutter futur)
- `src/lib/supabase/{client,server,admin,middleware}.ts` — 4 clients distincts
- `supabase/migrations/*.sql` — schéma versionné, RLS activé partout

## Règles strictes
1. **Backend = source de vérité** — jamais recalculer prix/stock/promos côté front
2. **RLS partout** — jamais bypass sans passer par `admin.ts` (marqué `server-only`)
3. **IA jamais d'invention** — SKUs fournis en contexte, validation serveur, audit dans `ai_messages.provided_skus`
4. **Multi-store natif** — toute donnée stock/prix/commande a un `store_id`
5. **Composants sans logique métier** — appels via hooks vers `/services`
6. **Aucun texte hardcodé** — passer par `t('key')` (next-intl)
7. **Aucune couleur en dur** — utiliser les tokens `--color-*` de `globals.css`
8. **Chaque feature UI a** : loading · empty · error · success

## Phasage
**Phases 1 → 8 livrées ✅** (85 routes, 190 fichiers TS, 10 migrations, 14/14 tests).
Voir `docs/PHASE-*.md` pour chaque phase et `docs/ROADMAP.md` pour la suite.

## Commandes utiles
- `pnpm dev` · `pnpm build` · `pnpm typecheck`
- `pnpm db:start` (Docker Supabase) · `pnpm db:reset` · `pnpm db:types`
