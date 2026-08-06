import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db'
import {
  courseChapters,
  courseChapterTranslations,
  resources,
  resourceTranslations,
} from '@/db/schema'
import {
  adminListChapters,
  adminListResources,
  getPublishedBySlug,
  listChapters,
  listPublished,
  listPublishedTags,
} from '@/lib/content'
import { resetDb } from './harness'

type Translation = { locale: 'en' | 'zh'; title: string; summary?: string }

async function insertResource(
  slug: string,
  translations: Translation[],
  overrides: Partial<typeof resources.$inferInsert> = {},
): Promise<string> {
  const [row] = await db
    .insert(resources)
    .values({ type: 'tool', slug, status: 'published', ...overrides })
    .returning({ id: resources.id })
  if (translations.length > 0) {
    await db.insert(resourceTranslations).values(
      translations.map((t) => ({
        resourceId: row.id,
        locale: t.locale,
        title: t.title,
        summary: t.summary ?? '',
      })),
    )
  }
  return row.id
}

beforeEach(async () => {
  await resetDb()
})

describe('listPublished', () => {
  test('hides drafts and untranslated resources', async () => {
    await insertResource('visible', [{ locale: 'en', title: 'Visible' }])
    await insertResource('draft', [{ locale: 'en', title: 'Draft' }], {
      status: 'draft',
    })
    await insertResource('untranslated', [])

    const items = await listPublished('tool', 'en')
    expect(items.map((i) => i.slug)).toEqual(['visible'])
  })

  test('falls back across locales with isFallback flag', async () => {
    await insertResource('both', [
      { locale: 'en', title: 'EN' },
      { locale: 'zh', title: 'ZH' },
    ])
    await insertResource('zh-only', [{ locale: 'zh', title: '只有中文' }])

    const en = await listPublished('tool', 'en')
    const zhOnly = en.find((i) => i.slug === 'zh-only')
    expect(zhOnly?.title).toBe('只有中文')
    expect(zhOnly?.isFallback).toBe(true)
    expect(en.find((i) => i.slug === 'both')?.isFallback).toBe(false)

    const zh = await listPublished('tool', 'zh')
    expect(zh.find((i) => i.slug === 'both')?.title).toBe('ZH')
  })

  test('filters by tag and by search query', async () => {
    await insertResource('tagged', [{ locale: 'en', title: 'Grep Tool' }], {
      tags: ['cli', 'search'],
    })
    await insertResource('other', [{ locale: 'en', title: 'Other' }], {
      tags: ['infra'],
    })

    const byTag = await listPublished('tool', 'en', { tag: 'cli' })
    expect(byTag.map((i) => i.slug)).toEqual(['tagged'])

    const byQuery = await listPublished('tool', 'en', { q: 'grep' })
    expect(byQuery.map((i) => i.slug)).toEqual(['tagged'])
  })
})

describe('listPublishedTags', () => {
  test('dedupes and sorts tags from published resources only', async () => {
    await insertResource('a', [{ locale: 'en', title: 'A' }], {
      tags: ['zeta', 'alpha'],
    })
    await insertResource('b', [{ locale: 'en', title: 'B' }], {
      tags: ['alpha'],
    })
    await insertResource('c', [{ locale: 'en', title: 'C' }], {
      tags: ['draft-tag'],
      status: 'draft',
    })
    expect(await listPublishedTags('tool')).toEqual(['alpha', 'zeta'])
  })
})

describe('getPublishedBySlug', () => {
  test('returns the published resource, null for drafts and unknowns', async () => {
    await insertResource('mine', [{ locale: 'en', title: 'Mine' }])
    await insertResource('hidden', [{ locale: 'en', title: 'Hidden' }], {
      status: 'draft',
    })

    expect((await getPublishedBySlug('tool', 'mine', 'en'))?.title).toBe('Mine')
    expect(await getPublishedBySlug('tool', 'hidden', 'en')).toBeNull()
    expect(await getPublishedBySlug('tool', 'nope', 'en')).toBeNull()
  })
})

describe('admin queries', () => {
  test('adminListResources includes drafts and untranslated resources', async () => {
    await insertResource('draft', [{ locale: 'en', title: 'Draft' }], {
      status: 'draft',
    })
    await insertResource('untranslated', [])

    const items = await adminListResources('en')
    expect(items.map((i) => i.slug).sort()).toEqual(['draft', 'untranslated'])
    expect(items.find((i) => i.slug === 'untranslated')?.title).toBe('')
  })
})

describe('chapters', () => {
  test('orders by position and applies per-chapter fallback', async () => {
    const courseId = await insertResource(
      'course-1',
      [{ locale: 'en', title: 'Course' }],
      { type: 'course' },
    )
    // Insert out of order to prove ordering comes from position.
    for (const position of [2, 1]) {
      const [ch] = await db
        .insert(courseChapters)
        .values({ courseId, position })
        .returning({ id: courseChapters.id })
      await db.insert(courseChapterTranslations).values({
        chapterId: ch.id,
        locale: position === 1 ? 'zh' : 'en',
        title: `Chapter ${position}`,
      })
    }

    const chapters = await listChapters(courseId, 'en')
    expect(chapters.map((c) => c.position)).toEqual([1, 2])
    expect(chapters[0].isFallback).toBe(true)
    expect(chapters[1].isFallback).toBe(false)

    const admin = await adminListChapters(courseId)
    expect(admin[0].translations.zh?.title).toBe('Chapter 1')
    expect(admin[0].translations.en).toBeUndefined()
  })
})
