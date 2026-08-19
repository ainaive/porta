# 0013 — Feature modules own their vertical slice, integrated through one registry

- **Status**: accepted
- **Date**: 2026-08-19

## Context

The portal is being organised into three functional areas — Tool Shelf, AI
Evaluation, and Help & Tutorials — each built by a different developer, with
more areas expected later. [ADR 0001](./0001-generic-resource-model.md) chose
one generic resource model with `section == resource type`, which keeps the
content kernel small but puts every section behind the same six shared files:
the `resource_type` enum, `src/lib/resource-meta.ts`, `src/lib/gating.ts`, the
`SECTIONS` arrays in `header.tsx` **and** `footer.tsx`, and both
`messages/*.json`. Two of those lists had already drifted into duplicates of
each other. Three teams editing all six on every change is a permanent merge
conflict, and nothing in the repo enforced any boundary: one `@/*` alias, no
`no-restricted-imports`, no layering plugin.

The new structure is also two levels deep — a module owns one or more sections
— which `sectionForType` cannot express at all.

## Decision

A **module** is a self-contained vertical slice under `src/modules/<id>/`,
owning its sections, zod meta schemas, message files, pages and tests. It
publishes a **pure-data manifest** (`defineModule` in
`src/core/module/define.ts`) declaring its sections, nav entries, gated paths
and message loaders. `src/core/module/registry.ts` lists the modules — one
import and one array entry each — and `derive.ts` computes everything the
platform used to hand-maintain: navigation, gated-path regexes, section/path
lookups, meta validation, message merging, redirects.

Manifests carry **no JSX, no database and no server-only imports**:
`src/proxy.ts` reaches the registry through `gating.ts`, and `next.config.ts`
will read it for redirects, so both need it to stay light and importable
without path aliases (hence the registry's relative imports).

The shared kernel stays: modules register sections against the existing
`resources` / `resource_translations` tables and inherit search, pagination,
locale fallback, the publish rule and the admin editor for free. A module that
outgrows `meta` jsonb — AI Evaluation will, since scores must be sortable in
SQL — declares its own tables in `src/modules/<id>/schema.ts`. This amends
ADR 0001 rather than reversing it: one kernel, plus module-owned tables where
the kernel genuinely does not fit.

Boundaries are enforced by `no-restricted-imports` in `eslint.config.mjs`, a
core ESLint rule, so ADR 0010's pinning of the `eslint-config-next` bundle is
untouched and `--max-warnings 0` makes a violation fail `bun run verify`:
only `src/core/module/registry.ts` and `src/app/**` may name a module; a
module may not import another module or a platform internal (`auth`,
`invites`, `email`, `admin-actions`). `@/db` stays open to modules on
purpose — owning tables is a supported seam, not a leak.

Rejected: **workspace packages** per module (strongest boundary, but it
restructures the repo root and reworks the Dockerfile, Vercel build, drizzle,
biome, eslint and playwright configs for a boundary ESLint already gives);
**separate deployables / microfrontends** (independent deploys, but it
contradicts [ADR 0005](./0005-dual-deployment-targets.md)'s single self-hosted
container and would need an ADR superseding it); **per-module tables with no
shared kernel** (real isolation at roughly three times the query, admin and
fallback code, losing unified search and the home overview); **a catch-all
`[module]/[[...rest]]` route** dispatching from the registry (loses per-route
layouts, metadata and typed routes, and collides with the existing top-level
routes).

## Consequences

- Adding a module is one directory plus one line in `registry.ts`. No core
  file, no core migration, no shared message file.
- `src/core/module/registry.test.ts` makes that self-checking: it fails on
  duplicate section keys or paths, a module id that shadows a core message
  namespace, a nav entry out of order, a gated listing, or a manifest naming a
  message key it does not ship — in either locale.
- Message files split per module, so `bun run i18n:check` now diffs the core
  bundle and each module bundle separately and names the failing file.
- Type-specific admin fields render from `metaField` descriptors, so a module
  adds a field without touching core admin code. The cost is that the
  video form's three-column grid becomes the standard two-column one.
- `ResourceType` stays a closed union, derived from the manifests' literal
  section keys via a `const` type parameter — a section that is not registered
  cannot be stored.
- Security is still explicitly **not** structural: module pages call
  `requireSession()` and module actions call `requireAdmin()` exactly as
  before. A module directory is an ownership boundary, not a trust boundary.
- The landing page still names specific sections by hand (ADR 0008 holds its
  copy to shipped capability). That coupling is deliberate and stays until the
  tiles themselves move into modules.
- Migrations still land in one `drizzle/` folder, so two modules generating
  migrations concurrently conflict in `drizzle/meta/_journal.json`. The
  resolution is mechanical — regenerate — and is the accepted price of a
  single-container deployment.
