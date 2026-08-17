# Contribuer à AZ Monoprix

## Setup local

```bash
git clone https://github.com/<user>/az-monoprix.git
cd az-monoprix
pnpm install
cp .env.local.example .env.local
pnpm db:start
pnpm db:reset
pnpm dev
```

## Workflow

1. Créer une branche depuis `main` :
   ```bash
   git checkout -b feat/nom-de-la-feature
   ```
2. Commiter avec un message clair (préfixes : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`)
3. `pnpm typecheck && pnpm build` avant de push
4. Ouvrir une PR sur `main` (le template PR se remplit automatiquement)
5. La CI GitHub Actions doit être verte avant merge

## Conventions

- **TypeScript strict** — pas de `any` implicite
- **RLS sur toutes les nouvelles tables**
- **Zod pour toutes les entrées API**
- **Aucun texte hardcodé** — passer par `t('key')` (next-intl)
- **Aucune couleur en dur** — utiliser les tokens `--color-*`
- **Composants sans logique métier** — appels via hooks vers `/services`

## Structure

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour la vision d'ensemble et
[`docs/PHASE-*.md`](docs/) pour le détail par phase.

## Signaler un bug / proposer une feature

Utiliser les templates d'issue :
- [🐛 Bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- [✨ Feature request](.github/ISSUE_TEMPLATE/feature_request.md)
