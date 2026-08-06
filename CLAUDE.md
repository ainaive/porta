@AGENTS.md

## Project conventions

- **Verify gate**: `bun run verify` (format check, zero-warning lint,
  typecheck, i18n key parity, unit + DB tests) must pass before anything
  lands on main. E2E: `bun run test:e2e` (needs local Postgres; uses a
  throwaway porta_e2e database).
- Test layout: unit tests are colocated `*.test.ts`; DB integration in
  `tests/db/`; Playwright specs are `e2e/*.e2e.ts` (never `.test.ts` /
  `.spec.ts` — bun test would grab them).
- Domain vocabulary lives in `CONTEXT.md`; architecture and conventions in
  `docs/architecture.md`; decisions in `docs/adr/`. When a change alters
  domain language or reverses a decision, update these in the same PR (new
  ADR supersedes rather than edits history).
- Conventional commits with a why-body; no AI-attribution lines in commits
  or PR descriptions.
- Formatting is Biome (`bun run format`); ESLint owns lint rules — don't
  enable Biome's linter.
