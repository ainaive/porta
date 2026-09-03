# 硅基生态平台 / Silicon Ecosystem — Domain Context

An internal developer portal: a public-facing website whose primary users are
internal employees. It is built as three feature modules — Tool Shelf, the
Handbook, and Events — over one generic content system, and is expected to
grow more. This file defines the project's shared vocabulary; use these words
with these meanings in code, docs, and discussion.

## Domain language

| Term | Meaning |
|---|---|
| **Product name** | **硅基生态平台** in Chinese, **Silicon Ecosystem** in English — a bilingual pair, not a translation of one another. It lives in exactly one place per locale, `common.appName` in `messages/*.json`; nothing else should spell it out. Copy that needs it inside a sentence takes an ICU `{appName}` placeholder. |
| **`porta`** | The **codename**, not the product. It names the repository, the npm package, module paths, and the `porta` / `porta_test` / `porta_e2e` databases, and is expected to stay there — renaming those buys nothing a user can see. Seeing `porta` in infrastructure and 硅基生态平台 in the UI is correct, not a leftover (ADR 0009). |
| **Module** | A feature area owned end to end by one team, living in `src/modules/<id>/`: its sections, zod meta schemas, pages, components, message file, tests, any tables of its own, and the external origins it embeds. It publishes a pure-data manifest (`defineModule`) and is wired in by a single line in `src/core/module/registry.ts`. Today: **Tool Shelf** (工具目录), the **Handbook** (文档与快速上手), **Events** (活动). Adding one touches no core file (ADR 0013). |
| **Registry** | `src/core/module/registry.ts` — the one file every module team shares. Navigation, gated paths, section lookups, meta validation, message merging, redirects, the CSP's `frame-src` and the crawl rules behind `robots.txt` / `sitemap.xml` are all *derived* from it in `derive.ts`; nothing else keeps a per-module list. The platform's own nav entries — Overview and Adoption, which belong to no module — are declared once as `coreNav` there, the way `platformGatedPaths` lives once in `src/lib/gating.ts`. |
| **Listing layout** | How a section's listing renders, declared as data on its manifest (`listing`) and drawn by core — the same split as `metaFields` and the admin form. `cards`, `table`, or `grouped` by a named `select` field. Two sections draw their own instead, because their layout needs data core cannot reach: Getting started shows a track's steps, and Events orders by date (ADR 0019). |
| **Facet** | A closed filter on a section's listing, declared as `facets` naming `select` meta fields on the same section. Core filters, counts and renders the chips; a count excludes its own field's selection so the alternatives stay legible. Only `select` qualifies — a facet needs a closed set of values to count (ADR 0019). |
| **Resource** | The one content entity. Typed by section key (stored as text in `resources.type`, validated against the registry), slugged (unique per type), draft or published, tagged, with type-specific data in a `meta` jsonb column validated by its section's zod schema. |
| **Adoption** | `/adoption` — what the catalog contains and where it is thin, counted from the catalog itself. There is no usage telemetry and nothing on the page may imply there is: published counts per section, bilingual coverage, tag distribution (ADR 0018). |
| **Section** | The public face of one resource type, belonging to exactly one module: a URL path, a listing page, labels. `tool`→`/tools`; `doc`→`/docs`; `track`→`/start`; `event`→`/events`. Each is its own nav entry; no module renders an index page of its own. |
| **Core** | `src/core/**` — what a module is allowed to call: the content kernel (queries, locale fallback, meta parsing, the server-action contract, listing and index page factories) and the module system. `src/lib/**` is platform internals (auth, invites, email, logging) and is *not* a module API; ESLint enforces both directions. |
| **Translation** | A per-locale content row (title/summary/body) attached to a resource or chapter. A resource with zero translations never surfaces publicly; publishing requires at least one. |
| **Fallback** | The locale policy in `src/core/content/fallback.ts`: show the requested locale's translation if it exists, otherwise the other locale's flagged `isFallback`, rendered as an "Untranslated / 未翻译" badge. Content is never hidden merely for being untranslated in one locale. |
| **Step** | An ordered unit of a track, owned by the Handbook module (its tables, queries and actions all live there). Positions are dense 1..n and URLs are positional (`/start/slug/N`); reordering swaps positions, deletion renumbers. |
| **Invite** | The only way to sign up (after bootstrap): a tokenized link, optionally locked to an email, expiring after 7 days, consumed exactly once. Enforced in the better-auth signup hooks, not in the UI. |
| **Bootstrap admin** | The first-ever account, allowed to sign up without an invite and granted the `admin` role. Replaces a seed-user step. |
| **Gating tiers** | (1) Public: landing, module indexes, section listings and `/search` (title/summary). (2) Signed-in: resource detail pages. (3) Admin: `/admin`, which 404s for non-admins rather than revealing it exists. A module declares which of its paths are gated; the patterns are derived, not hand-listed. Not to be confused with indexing: `/search` is public and stays crawlable, and keeps itself out of search engines with its own `noindex` — robots.txt must not disallow it, or the `noindex` is never fetched and never read (ADR 0016). |
| **Optimistic vs authoritative checks** | The proxy (`src/proxy.ts`) only checks session-cookie existence for fast redirects; `requireSession`/`requireAdmin` (`src/lib/session.ts`) are the authoritative checks and open every gated page and server action. |

## Pointers

- Architecture and conventions: `docs/architecture.md`
- Decision records: `docs/adr/`
- Setup and commands: `README.md`
- Landing gate before main: `bun run verify` (format + lint + types + i18n parity + tests)
