import { describe, expect, test } from 'bun:test'
import {
  groupResources,
  pickTranslation,
  type ResourceRow,
  type TranslationRow,
} from './fallback'

function makeResource(overrides: Partial<ResourceRow> = {}): ResourceRow {
  return {
    id: 'r1',
    type: 'tool',
    slug: 'a-tool',
    status: 'published',
    tags: [],
    meta: {},
    createdBy: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makeTranslation(
  overrides: Partial<TranslationRow> = {},
): TranslationRow {
  return {
    id: 't1',
    resourceId: 'r1',
    locale: 'en',
    title: 'English title',
    summary: '',
    body: '',
    ...overrides,
  }
}

describe('pickTranslation', () => {
  test('returns the requested locale without fallback flag', () => {
    const rows = [
      makeTranslation({ locale: 'en', title: 'EN' }),
      makeTranslation({ id: 't2', locale: 'zh', title: 'ZH' }),
    ]
    const picked = pickTranslation(rows, 'zh')
    expect(picked?.title).toBe('ZH')
    expect(picked?.isFallback).toBe(false)
  })

  test('falls back to the other locale with isFallback set', () => {
    const rows = [makeTranslation({ locale: 'zh', title: 'ZH only' })]
    const picked = pickTranslation(rows, 'en')
    expect(picked?.title).toBe('ZH only')
    expect(picked?.isFallback).toBe(true)
  })

  test('returns null when no translations exist', () => {
    expect(pickTranslation([], 'en')).toBeNull()
  })
})

describe('groupResources', () => {
  test('dedupes join rows into one resource with the picked translation', () => {
    const resource = makeResource()
    const rows = [
      { resource, translation: makeTranslation({ locale: 'en', title: 'EN' }) },
      {
        resource,
        translation: makeTranslation({ id: 't2', locale: 'zh', title: 'ZH' }),
      },
    ]
    const grouped = groupResources(rows, 'en')
    expect(grouped).toHaveLength(1)
    expect(grouped[0].title).toBe('EN')
    expect(grouped[0].isFallback).toBe(false)
  })

  test('drops resources without any translation', () => {
    const rows = [{ resource: makeResource(), translation: null }]
    expect(groupResources(rows, 'en')).toHaveLength(0)
  })

  test('flags fallback per resource independently', () => {
    const zhOnly = makeResource({ id: 'r2', slug: 'zh-only' })
    const rows = [
      {
        resource: makeResource(),
        translation: makeTranslation({ locale: 'en' }),
      },
      {
        resource: zhOnly,
        translation: makeTranslation({
          id: 't3',
          resourceId: 'r2',
          locale: 'zh',
        }),
      },
    ]
    const grouped = groupResources(rows, 'en')
    expect(grouped.find((r) => r.id === 'r1')?.isFallback).toBe(false)
    expect(grouped.find((r) => r.id === 'r2')?.isFallback).toBe(true)
  })
})
