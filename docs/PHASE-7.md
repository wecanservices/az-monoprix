# Phase 7 — Intelligence Artificielle · ✅ Terminée

Deux assistants IA + un moteur de recommandation, tous avec des
**garde-fous stricts** : la seule vérité vient de la base, jamais
du modèle.

## Livrables

### 1. Provider abstraction — `src/lib/ai/provider.ts`
- Interface `runCompletion<T>({ messages, json?, parse?, temperature?, maxTokens? })`
- Support Anthropic (Claude) + OpenAI, sélectionné par `AI_PROVIDER` (défaut : anthropic, `AI_MODEL=claude-sonnet-5`)
- `aiAvailable()` renvoie false si aucune clé configurée → chaque service dégrade gracieusement
- Types de résultat clairs : `not_configured` | `provider_error` | `invalid_json`

### 2. Assistant Courses (client) — `src/services/ai/shopping.ts`
Pipeline strict anti-hallucination :
```
prompt utilisateur
  → extractKeywords (retrait stopwords)
  → SELECT products WHERE ilike(any keyword) LIMIT 60
  → LLM avec SYSTEM prompt : "N'utilise QUE ces SKUs"
  → réponse JSON {suggestions[], message}
  → validation : chaque SKU doit être dans validSkus, sinon DROPPED
  → resolveSuggestionsWithPrices → attache id, prix, image
  → LOG dans ai_messages avec provided_skus (audit)
```

**Fallback sans clé API** : sélection basée sur mots-clés depuis le catalogue, marquée `fallback: true` dans la réponse.

### 3. Assistant Business (admin) — `src/services/ai/admin.ts`
- **Ne génère JAMAIS de SQL**. Pré-calcule les 6 sources analytiques puis les fournit au LLM avec instruction "n'invente aucun nombre"
- Prompt système en français, ton exécutif
- Sources retournées avec chaque réponse (transparence)
- **Fallback** : formatage bruteforce des chiffres pertinents

### 4. Smart Basket — `src/services/ai/recommendations.ts`
**Pas de LLM** : heuristique de co-purchase.
```
SELECT order_items WHERE product_id IN (cart) → orders_ids
SELECT order_items WHERE order_id IN (orders_ids) AND product_id NOT IN (cart)
GROUP BY product_id ORDER BY count DESC LIMIT 6
```
Cold-start (panier vide) → produits `is_featured`.

### 5. API
| Route | Objet |
|---|---|
| `/ai/shopping` (POST) | Assistant Courses — retrieval + LLM + validation SKU |
| `/admin/ai/query` (POST) | Assistant Business — grounded on views |
| `/cart/recommendations` (GET) | Smart Basket |

### 6. UI Client — `/client/ai-shopping`
- Hero card gradient rouge AZ
- Input prompt + budget DA + nombre de personnes
- Exemples clickables (barbecue, courses semaine, bébé…)
- Résultats : cards produits avec quantité + raison, total estimé
- **Bouton "Tout ajouter"** → boucle sur POST `/cart/items` puis redirect `/client/cart`
- Bandeau "Mode dégradé" clairement affiché si `fallback: true`

### 7. UI Admin — `/admin/ai`
- Chat multi-tour avec Enter pour envoyer
- Exemples clickables
- Sources affichées sous chaque réponse

## Audit anti-hallucination
Chaque appel Assistant Courses persiste :
```sql
INSERT ai_messages (role='assistant', content=..., structured=JSON,
                    provided_skus=array_of_skus, tokens_input, tokens_output, latency_ms)
```
Une inspection SQL permet à tout moment de vérifier que les SKUs renvoyés étaient bien dans le set fourni.

## Vérifications
```bash
pnpm typecheck   # ✅
pnpm build       # ✅
```

Les APIs fonctionnent **sans clé API** grâce au fallback : parfait pour tester le parcours UX avant de brancher Anthropic/OpenAI.

## Décisions techniques
- **Text-to-SQL évité** : l'admin ne peut pas écrire de SQL via le LLM — trop risqué. On lui donne à la place les 6 buckets déjà calculés (le vrai savoir métier).
- **Whitelist SKU stricte** : côté client, un SKU inventé est silencieusement filtré, jamais rendu.
- **`provided_skus` dans DB** : chaque réponse IA est traçable — on peut vérifier qu'aucun SKU renvoyé n'était hors contexte.
- **Fallback sans clé** : rend le parcours démonstrable en local sans Anthropic/OpenAI.
- **Smart Basket = heuristique** : plus rapide, déterministe et n'engage aucun coût LLM.
