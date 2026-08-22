# 0016 — Cross-section search, public but never indexed

- **Status**: accepted
- **Date**: 2026-08-22

Extends [ADR 0011](./0011-search-and-pagination.md) and adds a third category to
the crawl rules of [ADR 0014](./0014-security-headers-csp-and-rate-limiting.md).

## Context

[ADR 0011](./0011-search-and-pagination.md) gave every section listing free-text
search across both locales' title, summary and body, backed by three `pg_trgm`
GIN indexes on the translation columns. It scoped each search to one section,
because that was where the search box lived.

That leaves the visitor doing the routing. Someone looking for "deployment" has
to already know whether the thing they want is a tool, a course, a video or a
guide — and with seven sections across three modules, the answer is often "some
of each". [ADR 0008](./0008-landing-visual-system.md)'s claim check had already
caught this once: the imported design advertised a ⌘K global search, and the
copy was rewritten down to per-section search because the capability was not
there. Its rule is that adding the line means shipping the thing.

## Decision

- **One query across every registered section**, `searchPublished`. The
  per-section listing and the cross-section search now share their conditions
  and their pagination through two private helpers, because the ordering
  (`desc(createdAt), desc(id)`) and the has-a-translation guard are subtle
  enough that a second copy would drift. The only difference is scope: one
  `eq` on the type, or an `inArray` over the registry's keys.
- **No new index and no migration.** The `pg_trgm` indexes are on
  `resource_translations`, so they never cared which type a resource was.
- **Orphaned types are excluded in SQL, not after the fact.** `resources.type`
  is text and only the write path checks it against the registry (ADR 0013), so
  a retired section leaves published rows behind. `getHomeOverview` drops them
  in JS; a paginated query cannot, because dropping rows after the page was cut
  leaves the total lying and the page short.
- **`/search` is public.** Results carry title and summary — exactly what a
  signed-out visitor already reads on a section listing (tier 1 of the gating
  tiers). Gating it would put a search box in the header that bounced most
  first-time visitors to sign-in, while protecting nothing that is not already
  public.
- **`/search` is never indexed — via `noindex` alone, and it stays crawlable.**
  A search result page is not somewhere anyone should arrive from Google. The
  mechanism is the page's own `robots: { index: false, follow: true }`, and
  **robots.txt deliberately does not disallow the path.** The two look
  complementary and are not: a disallowed URL is never fetched, so its
  `noindex` is never read, while Google will still index a URL it has never
  fetched on the strength of the links pointing at it — and the header links to
  `/search` from every page. Disallow plus `noindex` yields the bare URL in
  results with no snippet, which is strictly worse than `noindex` alone.
  `follow` stays on so links out of a result page still count. It is absent
  from the sitemap for free rather than by exclusion: `publicPaths` derives
  from nav entries and section paths, and search is neither.
- **Nothing links to a query URL**, so the unbounded `?q=` space is not
  reachable by crawling: the header and the landing tile both point at bare
  `/search`. Should that change, the answer is still `noindex` on the page, not
  a robots rule that would switch it off.
- **An empty query is a prompt, not a dump.** The section listings already
  exist for browsing; running the query on an empty box would put a full scan
  behind every crawler and stray link.
- **The section filter is derived** from the registry, and an unknown `?type=`
  is dropped rather than 404ing — a stale filter link is a reason to search
  everything, not to refuse to search.

Rejected: ranking and stemming, which ADR 0011 already left as a later
per-locale decision and which `ILIKE` cannot give; a ⌘K command palette, which
is the claim ADR 0008 removed and which needs a client component and a
keyboard-shortcut story before it is worth making again.

## Consequences

- The landing's search tile and preview mock can now describe cross-section
  search honestly, which is the upgrade ADR 0008's rule was holding back. The
  tile also becomes a link to `/search`.
- `ResourceCard` grows a `showSection` flag. Results span sections, so a card
  has to say which one it came from — a title alone does not tell you whether
  you found a tool or the course about it. It stays off inside a section
  listing, where it would repeat the page heading on every row.
- Search inherits ADR 0011's trade-offs unchanged: substring matching with no
  ranking, and offset pagination that can drift under concurrent writes. Keyset
  pagination remains the escape hatch.
- Result cards link to gated detail pages, so a signed-out visitor searching
  successfully still meets the sign-in wall on the way in. That is the gating
  model working, but it means search is most useful once signed in.
- `robots.ts` now carries exactly one kind of rule: **gated** paths. A path that
  is public but should not be indexed does not belong there and says so itself.
  The comment in `robots.ts` states the trap, because "also disallow it in
  robots.txt" is the obvious-looking change that would silently undo this.
- Crawlers will fetch `/search` and any `?q=` URL that someone links to
  externally. That is the cost of the `noindex` being readable, and it is small
  — the query is bounded by `PAGE_SIZE`, and the page is `force-dynamic`
  anyway. If crawl volume ever becomes a real cost, the lever is rate limiting
  or a `Crawl-delay`, not a disallow.
