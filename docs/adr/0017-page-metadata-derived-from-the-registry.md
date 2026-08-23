# 0017 — Page metadata derived from the registry, origin read at runtime

- **Status**: accepted
- **Date**: 2026-08-23

Extends [ADR 0013](./0013-feature-modules-and-the-module-registry.md) the way
[ADR 0015](./0015-landing-tiles-derived-from-the-registry.md) did for the
landing tiles, and completes the crawl surface
[ADR 0014](./0014-security-headers-csp-and-rate-limiting.md) and
[ADR 0016](./0016-global-search-and-the-unindexed-public-path.md) began.

## Context

`robots.txt` and `sitemap.xml` have been derived from the module registry since
ADR 0014, and ADR 0016 settled which paths are public. The sitemap advertises
the landing, each module index and each section listing, once per locale —
about twenty URLs.

Every one of them rendered the same `<title>` and the same `<meta
name="description">`. Neither `createListingPage` nor `createModuleIndexPage`
exported `generateMetadata`, so all of them inherited the root layout's, whose
description is `home.subtitle` — the string ADR 0015 recorded as knowingly
stale, enumerating four of the seven sections. The result was that the copy a
crawler indexed for the whole public surface was both duplicated and wrong.

Nothing carried a canonical URL or a head-level `hreflang` either. The
locale cross-linking existed only inside `sitemap.ts`, so a crawler arriving at
`/en/tools` directly had nothing telling it `/zh/tools` was the same page. The
obstacle was that the canonical origin is not known at build time: ADR 0005
forbids `NEXT_PUBLIC_*` for environment-dependent values so one image runs
anywhere, which is why `robots.ts` and `sitemap.ts` are already `force-dynamic`
and why `canonicalBaseURL()` reads server env per call.

## Decision

- **The page factories carry the metadata.** `createListingMetadata(type)` and
  `createModuleIndexMetadata(moduleId)` sit beside the page factories in
  `src/core/content/`, building title and description from the same
  `titleKey` / `descriptionKey` that already name the section in the nav and
  head its page. A module exports the result and its route mount re-exports it
  alongside `default` — the pattern the detail pages already used. A new
  section arrives with its own title, description, canonical and unfurl for
  free; per-section copy stays in the owning module's bundle, as tile copy does
  after ADR 0015.
- **A module's index path is derived, not declared.** `moduleIndexPath` finds
  the nav entry every one of the module's sections hangs off. It throws rather
  than guessing when there is none (Tool Shelf, whose single section sits at
  its nav href) — a page that has no public URL must not claim a canonical.
- **One helper computes every public URL.** `localeUrls` in `src/lib/metadata.ts`
  backs both `sitemap.ts` and each page's `alternates`, so a URL the sitemap
  advertises and the canonical that page claims are the same string by
  construction. `canonicalBaseURL()` moved here from `src/lib/auth.ts`: page
  metadata should not drag better-auth and the Drizzle adapter into every
  public listing route to read two environment variables.
- **No origin, no claim.** When neither `BETTER_AUTH_URL` nor
  `VERCEL_PROJECT_PRODUCTION_URL` is set, `localeAlternates` returns undefined
  and `og:url` is omitted — the same choice `sitemap.ts` already makes by
  emitting no entries. Rejected: resolving a relative canonical against
  `metadataBase`, which would name the wrong URL as authoritative rather than
  naming none.
- **The canonical lives on the page, never on the layout.** Next inherits
  metadata down the tree, so a canonical set once in `[locale]/layout.tsx`
  would be claimed by every page that does not override it — telling a crawler
  that `/en/sign-in` is really the landing. The layout sets `metadataBase`, the
  title template and the description; the landing, the listings and the module
  indexes each set their own `alternates`.
- **One `main` landmark, opened by the layout.** Twenty-eight pages each
  rendered their own, and none carried an `id`, so there was no skip-link
  target and no single answer to "where does the content start?". The layout
  now opens `<main id="main-content" tabIndex={-1}>` and pages render plain
  boxes inside it. A visually-hidden skip link is the first focusable element
  on every page.
- **The landing copy stops enumerating sections.** `home.subtitle` and
  `home.heroSub` now name the three modules and claim only shipped capability —
  catalogue, both languages, search — instead of listing four of seven
  sections. ADR 0008's claim check makes stale copy a defect, and this string
  is also the site description, so it was the one sentence every crawler read.

## Consequences

- The description a crawler indexes for a section is now the section's own
  one-line description — written as UI copy, not as a meta description. That is
  a real constraint on how those strings are worded from here: they are read in
  two places.
- Detail pages gained a description from the resource summary, but they are
  behind `requireSession` and stay out of the sitemap, so it is a tab title and
  an in-app share rather than anything a crawler sees. `getPublishedBySlug` is
  React-cached, so it costs no extra query; `listChapters` is now cached for
  the same reason, since chapter pages finally have metadata of their own.
- **Still no `opengraph-image`.** The unfurl carries title, description and
  site name; a link pasted into a chat client renders as a text card. An image
  needs a design pass against ADR 0008's brand tokens and is deliberately left
  out rather than filled with a placeholder. `twitter.card` is `summary` and
  must become `summary_large_image` only when there is an image to show.
- A module that adds an index page and forgets to make its sections hang off
  its nav href gets a thrown error at module scope, which fails the build. That
  is the intended failure mode — loud, and at the point of the mistake — but it
  does mean `moduleIndexPath` is not safe to call speculatively.
- ADR 0014's foreclosure is untouched and now has one more reason behind it:
  page metadata reads the origin from server env at request time, so a
  prerendered route would bake in the build's idea of it — empty for the
  container target. **Partial Prerendering and Cache Components remain
  incompatible with the nonce CSP, and adopting either still needs a
  superseding ADR.**
- The root `not-found.tsx` covers paths that never reach the locale tree (the
  proxy matcher skips anything containing a dot). Like `global-error.tsx` it is
  above the locale layout, so it ships its own document with inline styles and
  English copy — a second place that cannot be translated, and a second place
  to check when the brand changes.
