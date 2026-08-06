# 0007 — QA stack: Biome + ESLint split, bun-test pyramid, Playwright, CI-verified Docker

- **Status**: accepted
- **Date**: 2026-08-06

## Context

V1 shipped with no formatter, no tests, and no CI, and the Docker path had
never run end-to-end (no Docker on the dev machine). The QA stack had to fit
the Bun toolchain and the dual-deployment constraints.

## Decision

- **Biome formats, ESLint lints.** Biome (formatter + import organizing,
  linter disabled) owns style; eslint-config-next stays the single lint
  truth at `--max-warnings 0`. Zero rule overlap by construction.
- **bun test** runs the pyramid's lower layers: colocated `*.test.ts` unit
  tests over extracted pure modules, and `tests/db/` integration suites
  against a dedicated `porta_test` database (created/migrated by the
  harness; preload force-assigns `DATABASE_URL` and refuses names without a
  `_test` suffix, because bun auto-loads `.env`).
- **Playwright** covers flows in `e2e/*.e2e.ts` (bun test owns `*.test.ts`)
  against a production build on port 3100 and a throwaway `porta_e2e`
  database recreated before each run.
- **GitHub Actions** runs four parallel jobs — quality, unit+DB tests, e2e,
  and a docker job that builds and boots the compose stack and curls it —
  on PRs and pushes to main. `bun run verify` is the equivalent local gate.

Rejected: Prettier (Biome chosen for speed and one-tool ethos); Biome's
linter alongside ESLint (double reporting); skip-when-no-database test
behavior (silent green is worse than red — Postgres is a dev prerequisite);
Vitest (bun test is already in the toolchain).

## Consequences

- The signup contract, fallback policy, and gating rules are locked by
  tests; changing them intentionally means changing tests in the same PR.
- Docker regressions surface on every PR instead of at deploy time.
- Contributors need local Postgres for `bun run verify` (unit-only runs:
  `bun run test:unit`).
