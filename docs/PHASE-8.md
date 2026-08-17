# Phase 8 — Hardening · Performance · Tests · Docs · ✅ Terminée

Passe finale : sécurité, performance, tests, audit — pour que la
plateforme soit prête à un usage réel.

## Livrables

### 1. Sécurité HTTP — `next.config.ts` + `src/lib/security/csp.ts`
Headers globaux ajoutés :
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self), camera=(), microphone=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `poweredByHeader: false`

Utilitaire `buildCsp(nonce?)` prêt à être branché sur une middleware par-page lorsque tu passeras au CSP nonce-based (post-P8 optionnel).

### 2. Rate limiting — `src/lib/security/rate-limit.ts`
- Token-bucket in-memory (Map<key, {count, reset}>)
- `limitByKey(key, max, windowMs)` · `limitByIp(ip, route)` · `ipFromRequest(req)`
- Interface identique à Upstash/Redis → swap trivial pour la prod multi-instance

### 3. Logger structuré — `src/lib/logger/index.ts`
`log.debug/info/warn/error(msg, meta)` → JSON une ligne. Zéro PII par convention. Prêt pour pino/otel plus tard.

### 4. Audit centralisé — `src/services/audit/index.ts`
`recordAudit({ actorId, action, entityType, entityId, before, after, metadata })` — non-bloquant, écrit dans `audit_log`. À appeler depuis les mutations sensibles (annulation commande, refund, changement rôle).

### 5. Pagination utilitaire — `src/lib/pagination.ts`
`parsePage(searchParams, { limit, maxLimit })` → `{ limit, offset, page }`. À utiliser dans toutes les routes list.

### 6. Migration `20260817000010_perf_indexes.sql`
11 index additionnels ciblant les hot loops (client home, driver missions, notifications unread, panier, promos, alertes stock, historique fidélité, messages IA). Tous `IF NOT EXISTS`.

### 7. Tests unitaires — `tests/unit/*`
- `cart-totals.test.ts` : 6 assertions (empty, subtotal, promo, delivery+discount, flooring, item_count)
- `state-machine.test.ts` : 8 assertions (transitions autorisées/refusées par acteur)
- Exécution : `pnpm tsx tests/unit/*.test.ts`
- **14/14 ✅** au dernier run

### 8. Docs finales
- `docs/PHASE-1.md` → `PHASE-8.md`
- `docs/ARCHITECTURE.md` (P1)
- `docs/ROADMAP.md` (nouveau)
- `README.md` mis à jour
- `CLAUDE.md` mis à jour
- `tests/README.md`

## Décisions techniques
- **Rate limit in-memory** volontaire pour dev — swap Redis en prod avec le même contrat.
- **CSP header via `headers()`** au lieu d'une middleware séparée : plus lisible, cache-friendly.
- **Tests via `tsx` + `console.log`** : zéro dépendance ajoutée, portable, CI-friendly. Migrable vers Vitest/node:test en 5 minutes si besoin.
- **`recordAudit` non-bloquant** : le business ne doit jamais échouer parce que l'audit échoue.
- **Indexes conditionnels** (`WHERE …`) pour les tables volumineuses : plus légers que des index globaux, particulièrement adaptés aux hot spots (notifications non lues, orders non terminées).

## Ce qui reste optionnel post-P8
- CSP nonce-based (middleware ajoutant un nonce par requête)
- Rate limit distribué (Upstash Redis) pour multi-instance
- Playwright end-to-end (le manuel checklist des PHASE-*.md tient lieu de tests d'intégration en attendant)
- pino + OpenTelemetry → APM
- Ajout `recordAudit(...)` sur les mutations existantes (P4/P5) qui n'y font pas encore appel — c'est un `find-and-add` mécanique

## Vérifications finales
```bash
pnpm typecheck                                # ✅
pnpm build                                    # ✅ 85 routes
pnpm tsx tests/unit/cart-totals.test.ts       # ✅ 6/6
pnpm tsx tests/unit/state-machine.test.ts     # ✅ 8/8
```
