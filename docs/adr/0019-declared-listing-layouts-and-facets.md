# 0019 — Listings declare their layout and their facets

- **Status**: accepted
- **Date**: 2026-09-03

Extends [ADR 0011](./0011-search-and-pagination.md) and applies the split
[ADR 0015](./0015-landing-tiles-derived-from-the-registry.md) established.

## Context

[ADR 0011](./0011-search-and-pagination.md) gave every section one listing:
free-text search, a single `tag` filter, and pagination, rendered as a grid of
identical cards. That was right while sections held short, self-describing
entries and differed only in their labels.

The design of [ADR 0017](./0017-workbench-visual-system.md) does not treat them
alike. Its tool catalog is a dense table behind a filter panel that facets on
category, maturity and language and shows a live count against each value.
Its docs page is grouped under headings. Its events page is an agenda ordered
by date. A single card grid renders none of them.

The obvious move — let each module ship its own listing component — is the one
[ADR 0015](./0015-landing-tiles-derived-from-the-registry.md) rejected for the
bento, and for the same reason: three teams shipping independent components
into one shell is how a system stops being one.

## Decision

- **A section names a layout; core owns every layout.** `listing` on the
  manifest is `{ kind: 'cards' | 'table' }` or
  `{ kind: 'grouped', groupBy }`. This is the split `metaFields` and
  `landingTile` already use — a module declares what its content is like, not
  how to draw it.
- **`grouped` groups by a `select` field the section declares**, in the order
  that descriptor lists its options, and `registry.test.ts` checks the name
  resolves to a `select`. Alphabetical order would put "Guides" before
  "Foundations", which is backwards for material whose whole point is a
  reading order. Ungrouped resources land in a catch-all rather than vanishing.
- **Facets are declared the same way.** `facets` names `select` fields on the
  same section; core does the filtering, the counting and the chips. Only
  `select` qualifies — a facet needs a closed set of values to count, and free
  text has none. Several values on one field OR together; different fields AND,
  which is how a reader expects "Go tools that are GA" to behave.
- **A facet's counts exclude its own selection.** Included, picking Go would
  read `go 12` with every sibling `0`, and there would be no way to see what
  widening the choice buys. Every *other* active filter still applies.
- **A value nothing carries is not rendered** — unless it is already applied,
  in which case hiding it would strand the reader on a chip they cannot
  unclick.
- **`MetaFieldOption` grows `labelKey`.** Literal labels were right while
  options were proper nouns (YouTube, Bilibili); a facet chip has to read
  "Observability" or "可观测性" while the stored value stays `observability`.
  One key, resolved through the module's namespace, so the admin dropdown, the
  facet chip and the group heading cannot disagree.
- **Two sections keep their own page.** Getting started shows each track
  beside its steps, and steps are the handbook's own table — core reading them
  would be the dependency [ADR 0013](./0013-feature-modules-and-the-module-registry.md)
  exists to prevent. Events orders and splits on a date, which no generic
  layout knows about. Both ship a page under `src/modules/*/pages/`, which is
  already where a module's hand-written detail pages live; the generic factory
  stays generic.

Rejected: **a `layout` component registry** mapping section keys to
components — the same proposal ADR 0015 turned down, with the same failure
mode. Also rejected: **facets as tags**, which needs no schema and no
migration but gives no counts per value, no validation, and puts a tool's
language and a course's subject in one namespace.

## Consequences

- The line between "core renders it" and "the module renders it" is now a
  judgement call rather than a rule. The test that has held so far: if the
  layout needs a table only one module owns, that module ships the page.
- Facet filtering reads `meta->>'field'` with no supporting index. Fine at
  catalog scale; a section with tens of thousands of rows would want an
  expression index per facet.
- The counts query groups by ordinal, because the field name binds as a
  parameter and Postgres will not prove `meta->>$1` in the select and
  `meta->>$4` in the GROUP BY are the same expression.
- Adding a facet is now a schema change: a `select` field, its options, its
  labels in both locales, and a backfill for existing rows. That is the cost
  of counts that can be trusted.
