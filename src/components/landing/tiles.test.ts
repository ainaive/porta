import { describe, expect, test } from 'bun:test'
import type { ResolvedSection } from '@/core/module/derive'
import { GRID_COLUMNS, packTiles, quoteFields, sectionTiles } from './tiles'

function section(
  key: string,
  landingTile?: ResolvedSection['landingTile'],
): ResolvedSection {
  return {
    key,
    path: `/${key}s`,
    titleKey: `${key}s.title`,
    descriptionKey: `${key}s.description`,
    meta: {} as ResolvedSection['meta'],
    metaFields: [],
    moduleId: 'test',
    landingTile,
  } as ResolvedSection
}

const spans = (tiles: readonly { span: number }[]) => tiles.map((t) => t.span)

describe('sectionTiles', () => {
  test('skips sections that declared no tile', () => {
    const registered = [
      section('tool', { kind: 'list', titleKey: 't', descriptionKey: 'd' }),
      section('secret'),
    ]
    const tiles = sectionTiles(() => 5, registered)
    expect(tiles.map((t) => t.section.key)).toEqual(['tool'])
  })

  test('suppresses a declared tile whose section has nothing published', () => {
    const registered = [
      section('tool', { kind: 'list', titleKey: 't', descriptionKey: 'd' }),
      section('guide', { kind: 'stat', titleKey: 't', descriptionKey: 'd' }),
    ]
    const counts: Record<string, number> = { tool: 3, guide: 0 }
    const tiles = sectionTiles((key) => counts[key] ?? 0, registered)
    expect(tiles.map((t) => t.section.key)).toEqual(['tool'])
  })

  test('width follows the tile kind', () => {
    const registered = [
      section('tool', { kind: 'list', titleKey: 't', descriptionKey: 'd' }),
      section('agent', { kind: 'stat', titleKey: 't', descriptionKey: 'd' }),
      section('model', {
        kind: 'fields',
        titleKey: 't',
        descriptionKey: 'd',
        fields: ['provider'],
      }),
    ]
    expect(spans(sectionTiles(() => 1, registered))).toEqual([4, 2, 2])
  })

  test('preserves registry order', () => {
    const tile = { kind: 'stat', titleKey: 't', descriptionKey: 'd' } as const
    const registered = [
      section('guide', tile),
      section('tool', tile),
      section('course', tile),
    ]
    expect(sectionTiles(() => 1, registered).map((t) => t.section.key)).toEqual(
      ['guide', 'tool', 'course'],
    )
  })
})

describe('packTiles', () => {
  test('reproduces the hand-tuned grid for the four original tiles', () => {
    // tool(list) + three stats + bilingual + search — the composition ADR
    // 0008 shipped. The derived version must not move it.
    const packed = packTiles([
      { span: 4 },
      { span: 2 },
      { span: 2 },
      { span: 2 },
      { span: 2 },
      { span: 6 },
    ])
    expect(spans(packed)).toEqual([4, 2, 2, 2, 2, 6])
  })

  test('packs all seven sections into flush rows', () => {
    const packed = packTiles([
      { span: 4 }, // tool
      { span: 2 }, // course
      { span: 2 }, // guide
      { span: 2 }, // (spare)
      { span: 2 }, // (spare)
      { span: 2 }, // (spare)
      { span: 2 }, // (spare)
      { span: 2 }, // bilingual
      { span: 6 }, // search
    ])
    expect(spans(packed)).toEqual([4, 2, 2, 2, 2, 2, 2, 2, 6])
  })

  test('stretches the last tile of a row that cannot fit the next one', () => {
    // 4 + 4 overflows, so the first row's only tile fills the width.
    const packed = packTiles([{ span: 4 }, { span: 4 }])
    expect(spans(packed)).toEqual([6, 6])
  })

  test('stretches a short final row', () => {
    const packed = packTiles([
      { span: 2 },
      { span: 2 },
      { span: 2 },
      { span: 2 },
    ])
    expect(spans(packed)).toEqual([2, 2, 2, 6])
  })

  test('never emits a row wider than the grid', () => {
    const packed = packTiles(
      [4, 2, 2, 4, 2, 6, 2, 2, 2].map((span) => ({ span })),
    )
    let used = 0
    for (const tile of packed) {
      used += tile.span
      expect(used).toBeLessThanOrEqual(GRID_COLUMNS)
      if (used === GRID_COLUMNS) used = 0
    }
    expect(used).toBe(0)
  })

  test('clamps a tile wider than the grid instead of looping', () => {
    expect(spans(packTiles([{ span: 99 }, { span: 2 }]))).toEqual([6, 6])
  })

  test('numbers tiles in order, zero-padded', () => {
    const packed = packTiles(Array.from({ length: 11 }, () => ({ span: 2 })))
    expect(packed.map((t) => t.index).slice(0, 3)).toEqual(['01', '02', '03'])
    expect(packed.at(-1)?.index).toBe('11')
  })

  test('carries the caller payload through', () => {
    const packed = packTiles([{ span: 2, key: 'agent' }])
    expect(packed[0].key).toBe('agent')
  })

  test('handles an empty catalog', () => {
    expect(packTiles([])).toEqual([])
  })
})

describe('quoteFields', () => {
  const withMeta = (meta: unknown) => ({ meta })

  test('quotes the first item carrying every field', () => {
    const result = quoteFields(
      [
        withMeta({ provider: 'Anthropic' }),
        withMeta({ provider: 'OpenAI', endpoint: 'https://api.example/v1' }),
      ],
      ['provider', 'endpoint'],
    )
    expect(result?.values).toEqual({
      provider: 'OpenAI',
      endpoint: 'https://api.example/v1',
    })
  })

  test('skips non-string and blank values rather than printing them', () => {
    const result = quoteFields(
      [
        withMeta({ provider: 'X', endpoint: { url: 'https://api.example' } }),
        withMeta({ provider: 'Y', endpoint: '   ' }),
        withMeta({ provider: 'Z', endpoint: 'https://api.example/v1' }),
      ],
      ['provider', 'endpoint'],
    )
    expect(result?.values.provider).toBe('Z')
  })

  test('returns null when nothing carries the fields', () => {
    expect(quoteFields([withMeta({}), withMeta(null)], ['endpoint'])).toBeNull()
  })

  test('returns null for a meta that is not an object', () => {
    expect(
      quoteFields([withMeta('nope'), withMeta(7)], ['endpoint']),
    ).toBeNull()
  })

  test('returns null when no fields were named', () => {
    expect(quoteFields([withMeta({ endpoint: 'x' })], [])).toBeNull()
  })
})
