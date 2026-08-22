# 0015 — The landing page's tiles are derived from the module registry

- **Status**: accepted
- **Date**: 2026-08-22

Amends [ADR 0013](./0013-feature-modules-and-the-module-registry.md), whose
last consequence deferred exactly this, and the tile half of
[ADR 0008](./0008-landing-visual-system.md).

## Context

[ADR 0013](./0013-feature-modules-and-the-module-registry.md) moved every
per-section list into `src/core/module/registry.ts` and derived the rest:
navigation, gated paths, redirects, the CSP's `frame-src`, and the crawl rules
behind `robots.txt` and `sitemap.xml`. It closed with one exception — *"the
landing page still names specific sections by hand … that coupling is
deliberate and stays until the tiles themselves move into modules."*

That exception had started to cost something. `bento.tsx` hardcoded four
tiles — `tool`, `model`, `course`, `video` — so of the seven registered
sections, `agent`, `report` and `guide` could not appear on `/` no matter what
was published in them. The file also declared its own zod schema, `endpointMeta`,
duplicating `modelMeta` from `src/modules/ai-eval/module.ts`, with a comment
explaining that core must not depend on a module. The comment was right and the
duplication was the price; two copies of one schema drift.

The tension to resolve: [ADR 0008](./0008-landing-visual-system.md) made the
landing a designed composition — a 6-column bento with hand-tuned spans, not a
uniform grid of identical boxes — and held its copy to shipped capability. A
naive derivation would flatten it.

## Decision

- **A section declares a tile as data; core renders it.** `SectionDefinition`
  grows an optional `landingTile` of one of three kinds — `list` (the section's
  preview resources), `stat` (its published count and newest title), `fields`
  (a code panel quoting named `meta` keys). This is the same split that already
  governs the admin form: a module ships `metaFields` descriptors, not form
  components. Manifests stay pure data, which is what keeps `src/proxy.ts` —
  which reaches the registry through `src/lib/gating.ts` — free of the database.
- **A module never declares its own width.** Span follows kind (`list` 4,
  `stat` 2, `fields` 2), decided in core. A 6-column bento is one shared
  composition: a module widening its own tile narrows somebody else's row, and
  no per-module declaration could be checked for whether the rows still add up.
  Kind is what a module legitimately knows — how much it has to say.
- **Order is registry order.** No `order` field, which would re-open the same
  bidding. A module that wants its sections in a different order reorders them
  inside its own manifest.
- **The layout arithmetic is a pure function**, `src/components/landing/tiles.ts`:
  suppression, kind→span, a greedy first-fit packer that stretches each row's
  last tile to fill, and sequential numbering. It is unit-tested, and it is
  deliberately not in `derive.ts` — nothing the middleware pulls in should carry
  the landing page's grid maths. CSS `grid-auto-flow: dense` would pack for
  free but reorders, which would leave the `01`…`0N` kickers disagreeing with
  what the reader sees.
- **A tile is suppressed when its section has nothing published.** An empty
  tile reading `0` is worse than the section not appearing yet.
- **Tile copy moves to the module that owns the section**, as
  `<section>.landing.{title,description}` in that module's bundle. Core keeps
  only what it owns: the bento heading, and the bilingual and search tiles.
- **`fields` names `metaFields` names, not message keys**, so a tile resolves
  each label through the descriptor the admin form already uses and cannot
  drift from it. `registry.test.ts` asserts the names resolve, that only a
  `fields` tile names fields, and that a tile's copy keys exist in both locales.

Rejected: **a second, server-only registry** mapping each module to a landing
component. It would let a module ship JSX and solve the chapter-count problem
below outright, but three teams shipping independent components into one bento
is how you get back to the four identical section cards ADR 0008 was written to
escape. It also fails two existing gates — `MAY_NAME_A_MODULE` in
`boundaries.test.ts` is a single file, and `eslint.config.mjs` ignores exactly
one core file — and widening both to a list weakens the invariant ADR 0013
states as a rule. Also rejected: **a `stats` loader on the manifest**, mirroring
`MessageLoader`. Messages resolve to JSON; a stats loader would resolve to
`@/db` and drizzle, and the bundler compiles reachable dynamic-import chunks
whether the proxy calls them or not — precisely the failure the pure-data rule
exists to prevent.

## Consequences

- Adding a module still means one directory plus one line in `registry.ts`, and
  now that line also buys a landing tile. The claim in ADR 0013 gets stronger
  rather than gaining an exception.
- **The courses tile no longer shows a chapter count.** Chapters are a help-module
  table, so the number came from `countPublishedChapters()`, hand-wired through
  `page.tsx`. A manifest cannot hold that query, and keeping the seam meant one
  core file still carrying per-module knowledge. Courses and videos are now the
  same `stat` treatment. ADR 0008's claim check named "real course and chapter
  counts" among its substitutions: this removes a true statement rather than
  adding a false one, which is the direction that rule permits.
- The tile is **opt-in**, and `bun run module:new` scaffolds none. A section
  earns a tile by having something to show, which is what keeps ADR 0008's copy
  rule intact as modules multiply. It also keeps a freshly scaffolded module
  green on generation.
- `home.bento.subtitle` no longer enumerates the sections; under a variable
  tile set that copy was stale on day one. `home.subtitle` and `home.heroSub`
  still enumerate four of seven — true but incomplete, and untouched here.
- The derived order differs from the hand-written one: `agent` precedes `model`
  in the ai-eval manifest, so it now precedes it on the landing too.
- With the current seed the packer reproduces the shipped grid exactly
  (`4,2 | 2,2,2 | 6`), so the refactor is a visual no-op on existing data; with
  all seven sections it packs `4,2 | 2,2,2 | 2,2,2 | 6`.
- A `list` tile does not take a whole-tile link. `TileHead`'s
  `after:absolute after:inset-0` overlay paints above static in-flow anchors, so
  giving one to a tile whose body is a list of links would swallow every click.
- Reading `meta` for a `fields` tile is now guarded rather than parsed: values
  must be non-empty strings or the panel advances to the next resource. That is
  weaker than the zod schema it replaces, and deliberately so — the alternative
  was core importing a module's schema.
- Preview links on the landing point at gated detail pages, so a signed-out
  visitor following one lands on sign-in. True before for one tile; derivation
  multiplies it.
