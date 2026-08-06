# 硅基生态平台 / Silicon Ecosystem — Domain Context

An ecosystem toolchain portal: a public-facing website whose primary users are
internal employees. It catalogs tools, courses, teaching videos, and model API
resources behind one generic content system. This file defines the project's
shared vocabulary; use these words with these meanings in code, docs, and
discussion.

## Domain language

| Term | Meaning |
|---|---|
| **Product name** | **硅基生态平台** in Chinese, **Silicon Ecosystem** in English — a bilingual pair, not a translation of one another. It lives in exactly one place per locale, `common.appName` in `messages/*.json`; nothing else should spell it out. Copy that needs it inside a sentence takes an ICU `{appName}` placeholder. |
| **`porta`** | The **codename**, not the product. It names the repository, the npm package, module paths, and the `porta` / `porta_test` / `porta_e2e` databases, and is expected to stay there — renaming those buys nothing a user can see. Seeing `porta` in infrastructure and 硅基生态平台 in the UI is correct, not a leftover (ADR 0009). |
| **Resource** | The one content entity. Typed (`tool` \| `course` \| `video` \| `model_api`), slugged (unique per type), draft or published, tagged, with type-specific data in a `meta` jsonb column validated by the zod schema for its type (`src/lib/resource-meta.ts`). |
| **Section** | The public face of a resource type: URL segment, listing page, nav entry. Mapping lives in `sectionForType` (`tool`→`/tools`, `course`→`/courses`, `video`→`/videos`, `model_api`→`/models`). A new section is additive — see docs/architecture.md. |
| **Translation** | A per-locale content row (title/summary/body) attached to a resource or chapter. A resource with zero translations never surfaces publicly; publishing requires at least one. |
| **Fallback** | The locale policy in `src/lib/fallback.ts`: show the requested locale's translation if it exists, otherwise the other locale's flagged `isFallback`, rendered as an "Untranslated / 未翻译" badge. Content is never hidden merely for being untranslated in one locale. |
| **Chapter** | An ordered unit of a course. Positions are dense 1..n (URLs are `/courses/slug/N`); reordering swaps positions, deletion renumbers. |
| **Invite** | The only way to sign up (after bootstrap): a tokenized link, optionally locked to an email, expiring after 7 days, consumed exactly once. Enforced in the better-auth signup hooks, not in the UI. |
| **Bootstrap admin** | The first-ever account, allowed to sign up without an invite and granted the `admin` role. Replaces a seed-user step. |
| **Gating tiers** | (1) Public: landing + section listings (title/summary). (2) Signed-in: resource detail pages. (3) Admin: `/admin`, which 404s for non-admins rather than revealing it exists. |
| **Optimistic vs authoritative checks** | The proxy (`src/proxy.ts`) only checks session-cookie existence for fast redirects; `requireSession`/`requireAdmin` (`src/lib/session.ts`) are the authoritative checks and open every gated page and server action. |

## Pointers

- Architecture and conventions: `docs/architecture.md`
- Decision records: `docs/adr/`
- Setup and commands: `README.md`
- Landing gate before main: `bun run verify` (format + lint + types + i18n parity + tests)
