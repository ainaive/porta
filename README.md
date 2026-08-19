# 硅基生态平台 / Silicon Ecosystem

Ecosystem toolchain portal — a public-facing website whose primary users are
internal employees. The repository, package, and databases are named `porta`,
which is the codename rather than the product name (ADR 0009). It is built as
three feature modules over one generic content model, each owned end to end by
a different team and wired in by a single line of a registry (ADR 0013):

- **Tool Shelf** (工具货架) `/tools` — internal and ecosystem tools directory
- **AI Evaluation** (AI 评测) `/evals` — agent and model evaluations, plus
  reports; carries the model API docs, endpoints, and usage guides
- **Help & Tutorials** (帮助与教程) `/help` — courses with ordered chapters,
  teaching videos (embedded YouTube/Bilibili, no hosting), and written guides

More modules are expected; adding one touches no core file.

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
deployments fail better-auth's origin check. Previews still emit absolute
email links — auth falls back to `VERCEL_PROJECT_PRODUCTION_URL` (a system
variable; keep "Automatically expose System Environment Variables" on) and
trusts the preview's own origin so sign-in keeps working.

Email (password reset, invites) needs two more variables. The Resend
Marketplace integration provisions `RESEND_API_KEY`; you must also set
`EMAIL_FROM` to a sender on a Resend-verified domain — **it is required
whenever `RESEND_API_KEY` is set** (there's no implicit fallback sender, so a
missing `EMAIL_FROM` makes every invite and reset email silently skip). Leave
both unset to disable email — the flows then log a redacted skip status (the
subject only, never the link, which carries a token) instead of sending. To
inspect reset/invite links locally, point Resend at a dev mail catcher.

**Docker** — the app also runs as a self-hosted container (Next.js standalone
output, migrations applied on start):

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32) docker compose up --build
```

To send email from the container, pass `RESEND_API_KEY` and `EMAIL_FROM`
through (see `.env.example`); `docker-compose.yml` already forwards both.
Without them, email is skipped rather than sent.

Constraint to preserve: no Vercel-only service dependencies, and no
`NEXT_PUBLIC_*` env vars for environment-dependent values — all config is
read from server env at runtime so one image runs anywhere.

## Documentation

- [CONTEXT.md](./CONTEXT.md) — domain vocabulary
- [docs/architecture.md](./docs/architecture.md) — system overview,
  conventions, deployment constraints, and how to add a module or a section
- [docs/adr/](./docs/adr/) — decision records
