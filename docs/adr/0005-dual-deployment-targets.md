# 0005 — Dual deployment targets: Vercel and Docker standalone

- **Status**: accepted
- **Date**: 2026-08-06

## Context

Porta deploys to Vercel today but must also build and run as a self-hosted
container (Next.js standalone output) — a hard product requirement, not a
nice-to-have. Dual targets die by a thousand cuts unless the constraints are
explicit from the first commit.

## Decision

One codebase, with these standing constraints:

- No dependencies on Vercel-only services (Blob, KV/Edge Config, Vercel
  cron).
- All environment-dependent config is server-side and read at runtime —
  never `NEXT_PUBLIC_*`, which bakes values into the build.
- Postgres over a plain TCP driver (postgres.js), compatible with both Neon
  and docker-compose Postgres; `DATABASE_POOLED=1` flips off prepared
  statements for transaction poolers.
- The DB client is a lazy proxy and every DB-backed page is
  `force-dynamic`, so `next build` never opens a database connection —
  builds run in environments with no database (Docker build stage).

## Consequences

- Any feature wanting a Vercel-only primitive needs a portable abstraction
  or an ADR superseding this one.
- Static optimization of DB-backed pages is deliberately off the table; the
  portal is dynamic by design.
- CI's docker job (compose build + boot + smoke) is the regression net for
  the container path.
