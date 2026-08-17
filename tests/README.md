# Tests

## Structure

```
tests/
├── unit/              # Pure TS tests, no DB, no network. Run via tsx.
├── integration/       # Reserved for tests that need a live Supabase local.
└── e2e/               # Reserved for Playwright / Cypress flows.
```

## Running unit tests

```bash
pnpm tsx tests/unit/cart-totals.test.ts
pnpm tsx tests/unit/state-machine.test.ts
```

They print `✅` / `❌` and set `process.exitCode = 1` on failure — CI-friendly
as-is. To wire them into a single command later, swap to Vitest (drop-in) or
Node's built-in `node:test` runner.

## What to test next

- Coupon `evaluateCoupon` (needs mocked SupabaseClient — small stub)
- `computeTotals` × free_shipping (already implicitly covered)
- Driver `advanceMission` with a fake sb client
- API zod schemas (round-trip)

## Integration playbook (manual)

For end-to-end validation of the phased builds see
[`docs/PHASE-3.md`](../docs/PHASE-3.md) — it walks through creating a
customer, driver and admin then following an order end-to-end.
