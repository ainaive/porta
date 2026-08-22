import type { LandingTile } from '@/core/module/define'
import {
  type ResolvedSection,
  type SectionKey,
  sections,
} from '@/core/module/derive'

// The landing bento's layout arithmetic, kept pure so it can be unit-tested:
// which sections get a tile, how wide each one is, and how they pack into
// rows. The JSX lives in bento.tsx, which is only reachable through a browser.
//
// Deliberately not in core/module/derive.ts — src/proxy.ts reaches that file
// through src/lib/gating.ts, and nothing the middleware pulls in should be
// carrying the landing page's grid maths.

export const GRID_COLUMNS = 6

// Width follows the kind, and a module never declares it. A 6-column bento is
// one shared composition: a module widening its own tile narrows somebody
// else's row, and no per-module declaration could be checked for whether the
// rows still add up. Kind is the thing a module legitimately knows — how much
// it has to say — so core turns that into a width.
const SPAN_BY_KIND: Record<LandingTile['kind'], number> = {
  // A preview list needs room for the resource titles.
  list: 4,
  // A number and a title; two of these sit beside a list, three fill a row.
  stat: 2,
  fields: 2,
}

export type SectionTile = {
  section: ResolvedSection
  tile: LandingTile
  span: number
}

/** The sections with a tile to render: they declared one, and they have
 *  something published to put in it. The second half matters — a section with
 *  no resources would otherwise ship a tile reading `0` with an empty body,
 *  which is worse than the section simply not appearing yet. */
export function sectionTiles(
  countOf: (key: SectionKey) => number,
  registered: readonly ResolvedSection[] = sections,
): SectionTile[] {
  const tiles: SectionTile[] = []
  for (const section of registered) {
    const tile = section.landingTile
    if (!tile) continue
    if (countOf(section.key) <= 0) continue
    tiles.push({ section, tile, span: SPAN_BY_KIND[tile.kind] })
  }
  return tiles
}

export type Packable = { span: number }

/** Greedy first-fit into 6-column rows, with the last tile of each row
 *  stretched to fill whatever is left over. Without the stretch a row that
 *  cannot fit the next tile leaves a hole at its right edge; with it, every
 *  row is flush and the grid reads as a composition rather than a wrap.
 *
 *  Order is never changed. CSS `grid-auto-flow: dense` would do the packing
 *  for free but reorders to fill holes, which would leave the `01`…`0N`
 *  kickers disagreeing with what the reader sees. */
export function packTiles<T extends Packable>(
  tiles: readonly T[],
): (T & { index: string })[] {
  const packed: (T & { index: string })[] = []
  // Indices into `packed` for the row being filled, plus how much it holds.
  let row: number[] = []
  let used = 0

  const closeRow = () => {
    const last = row.at(-1)
    if (last !== undefined && used < GRID_COLUMNS) {
      packed[last] = {
        ...packed[last],
        span: packed[last].span + (GRID_COLUMNS - used),
      }
    }
    row = []
    used = 0
  }

  for (const tile of tiles) {
    // A tile wider than the grid would never fit and would loop forever below.
    const span = Math.min(Math.max(1, tile.span), GRID_COLUMNS)
    if (used + span > GRID_COLUMNS) closeRow()
    packed.push({
      ...tile,
      span,
      index: String(packed.length + 1).padStart(2, '0'),
    })
    row.push(packed.length - 1)
    used += span
  }
  closeRow()

  return packed
}

/** The newest item carrying every named field as a non-empty string, with
 *  those values pulled out.
 *
 *  `resources.meta` is jsonb, so it arrives typed `unknown` and nothing has
 *  validated it at read time — the owning module's zod schema runs on write.
 *  Quoting it blind would print `[object Object]` the day a field's shape
 *  changes, so every value is checked here and an item that fails is skipped
 *  in favour of the next one. */
export function quoteFields<T extends { meta: unknown }>(
  items: readonly T[],
  fields: readonly string[],
): { item: T; values: Record<string, string> } | null {
  if (fields.length === 0) return null
  for (const item of items) {
    if (typeof item.meta !== 'object' || item.meta === null) continue
    const meta = item.meta as Record<string, unknown>
    const values: Record<string, string> = {}
    let complete = true
    for (const field of fields) {
      const value = meta[field]
      if (typeof value !== 'string' || value.trim() === '') {
        complete = false
        break
      }
      values[field] = value
    }
    if (complete) return { item, values }
  }
  return null
}
