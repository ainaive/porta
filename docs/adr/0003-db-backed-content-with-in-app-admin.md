# 0003 — DB-backed content with an in-app admin area

- **Status**: accepted
- **Date**: 2026-08-06

## Context

Someone has to author and maintain the content. Options ranged from
MDX-in-repo (simplest, developers only) through an external headless CMS to
database-backed content with a built-in admin UI. Non-developer colleagues
are expected to contribute courses and tool docs.

## Decision

Content lives in Postgres and is edited in a role-gated `/admin` area inside
the app: resource CRUD with per-locale editing tabs, type-specific meta
forms rendered from the zod schemas, chapter management, invites, and user
administration. Mutations are server actions that each start with
`requireAdmin()` and zod-parse their input.

Rejected: MDX-in-repo (locks editing to developers and PRs); external CMS
(new vendor, new auth boundary, and the dual Vercel/Docker deployment would
need it reachable from both).

## Consequences

- Non-developers can contribute from day one; content changes don't ship
  through git.
- The admin area is real product surface that needs tests (covered by the
  Playwright suite) and i18n like everything else.
- Publishing rules are enforceable in one place (`saveSettings`: publish
  requires ≥1 translation).
