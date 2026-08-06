# Porta

Ecosystem toolchain portal — a public-facing website whose primary users are
internal employees. V1 hosts four sections built on one generic content model:

- **Tools** — internal and ecosystem tools directory
- **Courses** — structured learning paths with ordered chapters
- **Videos** — teaching videos (embedded YouTube/Bilibili, no hosting)
- **Model APIs** — model API docs, endpoints, and usage guides

Public visitors can browse the landing page and section listings; opening a
resource's full content requires sign-in. Sign-up is invite-only (admins
create copyable invite links), and content is managed in a role-gated admin
area with per-locale English/中文 editing.

## Stack

TypeScript · Next.js (App Router) · Tailwind CSS + shadcn/ui · next-intl
(en/zh) · Postgres + Drizzle ORM · better-auth · Bun (dev tooling) / Node
(production runtime)

## Development

Prerequisites: [Bun](https://bun.sh) and a local Postgres.

```bash
bun install
cp .env.example .env        # then set DATABASE_URL and BETTER_AUTH_SECRET
createdb porta
bun run db:migrate          # apply committed SQL migrations
bun run db:seed             # optional sample content
bun dev
```

The first account created at `/en/sign-up` becomes the administrator; after
that, sign-up requires an invite link created in `/admin/invites`.

### Scripts

| Script | Purpose |
|---|---|
| `bun run verify` | The landing gate: format check, lint, typecheck, i18n parity, unit + DB tests |
| `bun run test` / `test:unit` / `test:db` | bun test suites (DB suites use a dedicated `porta_test` database) |
| `bun run test:e2e` | Playwright suite against a production build + throwaway `porta_e2e` database |
| `bun run format` | Biome format + import organizing |
| `bun run db:generate` | Generate SQL migrations from schema changes |
| `bun run db:migrate` | Apply migrations (plain Node, same script as production) |
| `bun run db:seed` | Seed sample content (wipes content tables, keeps users) |
| `bun run auth:schema` | Regenerate `src/db/schema/auth.ts` from the better-auth config |
| `bun run i18n:check` | Verify en/zh message files have identical keys |

## Deployment

**Vercel** — `vercel.json` sets the build command to run migrations before
`next build`. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`
in the project environment. Use a plain TCP Postgres URL (Neon works; set
`DATABASE_POOLED=1` for pooled endpoints). Only production builds migrate —
preview builds skip the step and expect an already-migrated database, so
they never write to the database production shares. Leave `BETTER_AUTH_URL`
unset for Preview: pinning it to the production origin makes preview
deployments fail better-auth's origin check.

**Docker** — the app also runs as a self-hosted container (Next.js standalone
output, migrations applied on start):

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32) docker compose up --build
```

Constraint to preserve: no Vercel-only service dependencies, and no
`NEXT_PUBLIC_*` env vars for environment-dependent values — all config is
read from server env at runtime so one image runs anywhere.

## Documentation

- [CONTEXT.md](./CONTEXT.md) — domain vocabulary
- [docs/architecture.md](./docs/architecture.md) — system overview,
  conventions, deployment constraints, and how to add a new section
- [docs/adr/](./docs/adr/) — decision records
