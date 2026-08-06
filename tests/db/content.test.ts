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
  getHomeOverview,
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

describe('getHomeOverview', () => {
  test('partitions published resources by type and counts them all', async () => {
    await insertResource('t1', [{ locale: 'en', title: 'Tool 1' }])
    await insertResource('t2', [{ locale: 'en', title: 'Tool 2' }])
    await insertResource('c1', [{ locale: 'en', title: 'Course 1' }], {
      type: 'course',
    })
    await insertResource('v1', [{ locale: 'en', title: 'Video 1' }], {
      type: 'video',
    })

    const { sections } = await getHomeOverview('en')
    expect(sections.tool.count).toBe(2)
    expect(sections.course.count).toBe(1)
    expect(sections.video.count).toBe(1)
    // Every type has an entry even with nothing published for it.
    expect(sections.model_api).toEqual({ count: 0, items: [] })
  })

  test('counts only what a visitor can reach', async () => {
    await insertResource('visible', [{ locale: 'en', title: 'Visible' }])
    await insertResource('draft', [{ locale: 'en', title: 'Draft' }], {
      status: 'draft',
      tags: ['draft-tag'],
    })
    await insertResource('untranslated', [], { tags: ['orphan-tag'] })

    const overview = await getHomeOverview('en')
    expect(overview.sections.tool.count).toBe(1)
    expect(overview.latest.map((i) => i.slug)).toEqual(['visible'])
    expect(overview.tags).toEqual([])
  })

  test('previews at most three per section but latest spans all types', async () => {
    for (const n of [1, 2, 3, 4]) {
      await insertResource(`tool-${n}`, [{ locale: 'en', title: `Tool ${n}` }])
    }
    await insertResource('a-course', [{ locale: 'en', title: 'Course' }], {
      type: 'course',
    })

    const overview = await getHomeOverview('en')
    expect(overview.sections.tool.count).toBe(4)
    expect(overview.sections.tool.items).toHaveLength(3)
    expect(overview.latest).toHaveLength(5)
    expect(await getHomeOverview('en', 2)).toHaveProperty('latest.length', 2)
  })

  test('applies locale fallback and dedupes tags', async () => {
    await insertResource('zh-only', [{ locale: 'zh', title: '只有中文' }], {
      tags: ['cli', 'infra'],
    })
    await insertResource('both', [{ locale: 'en', title: 'EN' }], {
      tags: ['cli'],
    })

    const overview = await getHomeOverview('en')
    expect(overview.tags).toEqual(['cli', 'infra'])
    expect(overview.latest.find((i) => i.slug === 'zh-only')?.title).toBe(
      '只有中文',
    )
    expect(overview.latest.find((i) => i.slug === 'zh-only')?.isFallback).toBe(
      true,
    )
  })

  test('chapterCount ignores chapters of unpublished courses', async () => {
    const published = await insertResource(
      'live-course',
      [{ locale: 'en', title: 'Live' }],
      { type: 'course' },
    )
    const draft = await insertResource(
      'draft-course',
      [{ locale: 'en', title: 'Draft' }],
      { type: 'course', status: 'draft' },
    )
    await db.insert(courseChapters).values([
      { courseId: published, position: 1 },
      { courseId: published, position: 2 },
      { courseId: draft, position: 1 },
    ])

    expect((await getHomeOverview('en')).chapterCount).toBe(2)
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
