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
| `bun run db:generate` | Generate SQL migrations from schema changes |
| `bun run db:migrate` | Apply migrations (plain Node, same script as production) |
| `bun run db:seed` | Seed sample content (wipes content tables, keeps users) |
| `bun run auth:schema` | Regenerate `src/db/schema/auth.ts` from the better-auth config |
| `bun run i18n:check` | Verify en/zh message files have identical keys |

## Deployment

**Vercel** — `vercel.json` sets the build command to run migrations before
`next build`. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`
in the project environment. Use a plain TCP Postgres URL (Neon works; set
`DATABASE_POOLED=1` for pooled endpoints).

**Docker** — the app also runs as a self-hosted container (Next.js standalone
output, migrations applied on start):

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32) docker compose up --build
```

Constraint to preserve: no Vercel-only service dependencies, and no
`NEXT_PUBLIC_*` env vars for environment-dependent values — all config is
read from server env at runtime so one image runs anywhere.

## Adding a new section

The content model is generic; a new section is additive:

1. Add the type to the `resource_type` enum in `src/db/schema/content.ts` and
   generate a migration.
2. Add a meta zod schema in `src/lib/resource-meta.ts` (+ section mapping).
3. Add listing/detail pages under `src/app/[locale]/<section>/`.
4. Add the section to the nav and message files.
