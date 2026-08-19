# 硅基生态平台 / Silicon Ecosystem — Domain Context

An ecosystem toolchain portal: a public-facing website whose primary users are
internal employees. It is built as three feature modules — Tool Shelf, AI
Evaluation, and Help & Tutorials — over one generic content system, and is
expected to grow more. This file defines the project's shared vocabulary; use
these words with these meanings in code, docs, and discussion.

## Domain language

| Term | Meaning |
|---|---|
| **Product name** | **硅基生态平台** in Chinese, **Silicon Ecosystem** in English — a bilingual pair, not a translation of one another. It lives in exactly one place per locale, `common.appName` in `messages/*.json`; nothing else should spell it out. Copy that needs it inside a sentence takes an ICU `{appName}` placeholder. |
| **`porta`** | The **codename**, not the product. It names the repository, the npm package, module paths, and the `porta` / `porta_test` / `porta_e2e` databases, and is expected to stay there — renaming those buys nothing a user can see. Seeing `porta` in infrastructure and 硅基生态平台 in the UI is correct, not a leftover (ADR 0009). |
| **Module** | A feature area owned end to end by one team, living in `src/modules/<id>/`: its sections, zod meta schemas, pages, components, message file, tests, and any tables of its own. It publishes a pure-data manifest (`defineModule`) and is wired in by a single line in `src/core/module/registry.ts`. Today: **Tool Shelf** (工具货架), **AI Evaluation** (AI 评测), **Help & Tutorials** (帮助与教程). Adding one touches no core file (ADR 0013). |
| **Registry** | `src/core/module/registry.ts` — the one file every module team shares. Navigation, gated paths, section lookups, meta validation, message merging and redirects are all *derived* from it in `derive.ts`; nothing else keeps a per-module list. |
| **Resource** | The one content entity. Typed by section key (stored as text in `resources.type`, validated against the registry), slugged (unique per type), draft or published, tagged, with type-specific data in a `meta` jsonb column validated by its section's zod schema. |
| **Section** | The public face of one resource type, belonging to exactly one module: a URL path, a listing page, labels. `tool`→`/tools`; `agent`/`model`/`report`→`/evals/*`; `course`/`video`/`guide`→`/help/*`. A module with several sections also renders an index at its base path. |
| **Core** | `src/core/**` — what a module is allowed to call: the content kernel (queries, locale fallback, meta parsing, the server-action contract, listing and index page factories) and the module system. `src/lib/**` is platform internals (auth, invites, email, logging) and is *not* a module API; ESLint enforces both directions. |
| **Translation** | A per-locale content row (title/summary/body) attached to a resource or chapter. A resource with zero translations never surfaces publicly; publishing requires at least one. |
| **Fallback** | The locale policy in `src/core/content/fallback.ts`: show the requested locale's translation if it exists, otherwise the other locale's flagged `isFallback`, rendered as an "Untranslated / 未翻译" badge. Content is never hidden merely for being untranslated in one locale. |
| **Chapter** | An ordered unit of a course, owned by the Help & Tutorials module (its tables, queries and actions all live there). Positions are dense 1..n and URLs are positional (`/help/courses/slug/N`); reordering swaps positions, deletion renumbers. |
| **Invite** | The only way to sign up (after bootstrap): a tokenized link, optionally locked to an email, expiring after 7 days, consumed exactly once. Enforced in the better-auth signup hooks, not in the UI. |
| **Bootstrap admin** | The first-ever account, allowed to sign up without an invite and granted the `admin` role. Replaces a seed-user step. |
| **Gating tiers** | (1) Public: landing, module indexes, and section listings (title/summary). (2) Signed-in: resource detail pages. (3) Admin: `/admin`, which 404s for non-admins rather than revealing it exists. A module declares which of its paths are gated; the patterns are derived, not hand-listed. |
| **Optimistic vs authoritative checks** | The proxy (`src/proxy.ts`) only checks session-cookie existence for fast redirects; `requireSession`/`requireAdmin` (`src/lib/session.ts`) are the authoritative checks and open every gated page and server action. |

## Pointers

- Architecture and conventions: `docs/architecture.md`
- Decision records: `docs/adr/`
- Setup and commands: `README.md`
- Landing gate before main: `bun run verify` (format + lint + types + i18n parity + tests)
