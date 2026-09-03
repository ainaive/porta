# 0018 — The portal's content directory: six pages, four sections

- **Status**: accepted
- **Date**: 2026-09-03

Supersedes [ADR 0015](./0015-landing-tiles-derived-from-the-registry.md) and
amends the section list of
[ADR 0013](./0013-feature-modules-and-the-module-registry.md).

## Context

The site shipped three modules and seven sections: Tool Shelf (`tool`), AI
Evaluation (`agent`, `model`, `report`) and Help & Tutorials (`course`,
`video`, `guide`). The imported design (see
[ADR 0017](./0017-workbench-visual-system.md)) describes six pages — Overview,
Tool catalog, Docs & guides, Getting started, Events, Adoption — and has no
place for four of those seven.

It is also, like the design before it, a mock of a product that does not
exist: a `wb` CLI installed by a piped shell script, fourteen invented tools
with per-tool install counts, and an Adoption page of CLI telemetry (2,140
active users, 78 % of repos on one tool, 6.4 min median CI). ADR 0008 recorded
this exact failure mode once already, at the level of landing copy. Adopting
the directory literally would have moved it into the information architecture
and the database.

The site has never been public. That is what made the question answerable at
all: with no bookmarks, no inbound links and no indexed URLs, content is
disposable and paths may move without redirects.

## Decision

- **Retire AI Evaluation and Videos outright.** The module directory, its
  routes, messages and tests are deleted, and a migration drops the rows by
  `type`. Nothing was public, so this is a deletion rather than a migration.
- **Rename rather than rebuild the two that survive.** `course` becomes
  `track` at `/start` and `guide` becomes `doc` at `/docs`, and the module
  becomes the **handbook** — it no longer means "help". A track's ordered
  sub-units are **steps**, not chapters, so the tables are renamed with them.
  The chapter model was already exactly the design's numbered track steps;
  rebuilding it would have thrown away dense positions, positional URLs and
  prev/next for a rename.
- **Add Events as a real section, with no table of its own.** A session is a
  resource with a date on it. `date` is a required `YYYY-MM-DD` string rather
  than a timestamp: these happen in a room on one office's day, storing an
  instant invites a timezone conversion nobody asked for, and a zero-padded
  ISO day sorts and compares as text, which is what both the listing and the
  overview's "Next up" rely on.
- **Adoption reports the catalog, not usage.** There is no telemetry source
  and inventing one is the failure this ADR exists to avoid. The page keeps
  the design's components — big stat cards, a bar row per section, gap cards —
  and changes its subject to published counts, translation coverage and tag
  distribution. Coverage is the honest analogue of the design's "where we're
  losing people": a resource published in one language only still renders,
  marked untranslated, but it is reaching half its readers.
- **The bento is gone, and with it the tile system ADR 0015 built.**
  `tiles.ts`, its packer, its span table and its unit test are deleted. The
  principle that put them there survives and is applied more widely: the
  overview's path cards come from published tracks, its table from the newest
  resources, its stats from the same query the Adoption page runs. Nothing on
  the page is a hand-kept list.
- **`landingTile` stays on the manifest.** It is now read only for the section
  count on Adoption, not for a bento tile. Kept because it is the declaration
  a section makes about having something to say, and the next composition will
  want it.
- **Core contributes nav entries.** Overview and Adoption belong to no module,
  so they live once as `coreNav` in `derive.ts` — the same shape as
  `platformGatedPaths` in `gating.ts` — and the header and footer keep
  rendering one derived list.
- **The negative-claim test is kept and re-aimed** at this artboard's fiction:
  `wb install`, `wb doctor`, the Workbench wordmark, the invented telemetry
  figures. Adding a capability line still means shipping the capability or not
  shipping the line.

Rejected: **implementing the directory literally**, telemetry and CLI
included — a portal that reports numbers it does not measure is worse than one
that reports fewer. Also rejected: **keeping AI Evaluation alongside the new
sections**, which would have produced an eight-item nav the design has no
composition for, and left three sections nothing on the site links to.

## Consequences

- Four sections, three modules, six nav items. `resourceTypes` is
  `tool | doc | track | event`, and anything that pattern-matched the old
  union is a compile error rather than a silent gap.
- Two migrations that delete data. They are correct exactly because nothing was
  public; the same pair run against a live catalog would be data loss.
- `frame-src` has no contributor left, so the CSP narrows to `'self'` on its
  own. The `frameSrc` seam stays for the next module that embeds something.
- Events ships empty. Every listing has an empty state, and this is the one
  people will actually see, so it is worth keeping honest.
- The seed is now the only thing that makes the site look inhabited, and it
  seeds a fictional catalog. It refuses any non-local database, which is what
  keeps that a fixture rather than a claim.
