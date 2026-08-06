# 0004 — Always-prefixed locales and show-fallback-with-badge

- **Status**: accepted
- **Date**: 2026-08-06

## Context

Porta supports English and Chinese from day one. Two recurring i18n
decisions: whether the default locale hides its URL prefix, and what to do
when content exists in only one language (realistically most content, most
of the time).

## Decision

next-intl with `localePrefix: 'always'`: every URL carries `/en` or `/zh`,
so auth redirects, `next=` params, and shared links are never ambiguous.
For content, the fallback policy (`src/lib/fallback.ts`): show the
requested locale's translation when it exists, otherwise the other
locale's, flagged and rendered as an "Untranslated / 未翻译" badge.
Resources with no translation at all never surface publicly, and publishing
requires at least one translation.

Rejected: hidden default-locale prefix (root-path ambiguity in redirects
and middleware for marginal URL aesthetics); hiding untranslated content
per-locale (a bilingual team is better served by seeing content with an
honest badge than by locale-dependent gaps).

## Consequences

- UI chrome must be fully translated (enforced by `bun run i18n:check` key
  parity); content translation is incremental and visible.
- Every link helper must go through the locale-aware navigation API; plain
  `/path` hrefs are a bug.
- The badge is part of the product language — editors see at a glance what
  needs translating.
