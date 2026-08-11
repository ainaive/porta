# 0011 — Public search is trigram ILIKE across translations; listings paginate at the resource level

- **Status**: accepted
- **Date**: 2026-08-11

## Context

The public section listings originally fetched every published resource of a
type, joined its translations, and substring-matched the requested locale's
title and summary in JavaScript. That was blind to the body, ignored the
other locale, and re-scanned the whole set on every keystroke-triggered
reload — fine for a seed catalog, but it does not scale and it makes the
search feel broken (a term that appears only in a tool's docs returns
nothing).

Two shapes of the problem interact with the bilingual fallback model. Content
lives in `resource_translations` (one row per locale), and `listPublished`
collapses those rows into one displayed resource via the fallback policy
(`src/lib/fallback.ts`). So "search" must consider rows the caller may never
display, and "paginate" must count and slice **resources**, not the joined
translation rows.

## Decision

- **Search in SQL, across all translations and both text columns plus body.**
  A resource matches when any of its translations contains the query in
  `title`, `summary`, or `body` (`ILIKE '%q%'`, with the query's LIKE
  metacharacters escaped). This spans locales — a zh-only body is findable
  while browsing en — and the fallback policy still chooses what to display.
- **Trigram GIN indexes, not `to_tsvector`.** Postgres ships no Chinese
  tokenizer, and this content is mixed en/zh; full-text stemming would miss
  Chinese entirely. A `pg_trgm` GIN index on each of the three columns backs
  the `ILIKE` substring match on any script. The extension is enabled by a
  hand-added `CREATE EXTENSION IF NOT EXISTS pg_trgm` at the top of the
  migration, since drizzle-kit does not manage extensions.
- **Paginate at the resource level.** `listPublished` selects the page's
  resource ids first (ordered by `created_at desc`, `LIMIT`/`OFFSET`), then
  hydrates only those resources' translations — a `LIMIT` on the join would
  slice translation rows, not resources. It returns `{ items, total, page,
  pageSize }` (page size 24); the listing renders Prev/Next controls that
  carry the active search and tag.

## Consequences

- Search covers the body and both locales, and is index-backed as the catalog
  grows.
- Trigram matching is pure substring, not ranked relevance or stemming; a
  search for "running" will not match "run". That is an acceptable trade for
  bilingual correctness at this scale; a ranked/tokenized search would be a
  later, per-locale decision.
- Offset pagination is simple but can drift if resources are inserted between
  page loads; acceptable for a low-write editorial catalog. Keyset pagination
  is the escape hatch if that ever bites.
- Deploys must be able to `CREATE EXTENSION pg_trgm` (true on Neon and the
  self-hosted Postgres); the migration is idempotent via `IF NOT EXISTS`.
