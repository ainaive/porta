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
  PAGE_SIZE,
} from '@/lib/content'
import { resetDb } from './harness'

type Translation = {
  locale: 'en' | 'zh'
  title: string
  summary?: string
  body?: string
}

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
        body: t.body ?? '',
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

    const { items } = await listPublished('tool', 'en')
    expect(items.map((i) => i.slug)).toEqual(['visible'])
  })

  test('falls back across locales with isFallback flag', async () => {
    await insertResource('both', [
      { locale: 'en', title: 'EN' },
      { locale: 'zh', title: 'ZH' },
    ])
    await insertResource('zh-only', [{ locale: 'zh', title: '只有中文' }])

    const en = (await listPublished('tool', 'en')).items
    const zhOnly = en.find((i) => i.slug === 'zh-only')
    expect(zhOnly?.title).toBe('只有中文')
    expect(zhOnly?.isFallback).toBe(true)
    expect(en.find((i) => i.slug === 'both')?.isFallback).toBe(false)

    const zh = (await listPublished('tool', 'zh')).items
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
    expect(byTag.items.map((i) => i.slug)).toEqual(['tagged'])

    const byQuery = await listPublished('tool', 'en', { q: 'grep' })
    expect(byQuery.items.map((i) => i.slug)).toEqual(['tagged'])
  })

  test('search matches the body, case-insensitively, across locales', async () => {
    await insertResource('deep', [
      {
        locale: 'en',
        title: 'Tool',
        body: 'Contains the word Kubernetes deep down.',
      },
    ])
    await insertResource('zh-body', [
      { locale: 'zh', title: '工具', body: '正文里藏着 Terraform 这个词。' },
    ])
    await insertResource('miss', [{ locale: 'en', title: 'Nothing here' }])

    // Body-only match, lowercased query — the old title/summary JS filter missed both.
    expect(
      (await listPublished('tool', 'en', { q: 'kubernetes' })).items.map(
        (i) => i.slug,
      ),
    ).toEqual(['deep'])
    // A zh-only body is found even when browsing in en (search spans locales).
    expect(
      (await listPublished('tool', 'en', { q: 'terraform' })).items.map(
        (i) => i.slug,
      ),
    ).toEqual(['zh-body'])
  })

  test('a literal % in the query is matched, not treated as a wildcard', async () => {
    await insertResource('pct', [{ locale: 'en', title: '100% coverage' }])
    await insertResource('plain', [{ locale: 'en', title: 'coverage' }])

    expect(
      (await listPublished('tool', 'en', { q: '100%' })).items.map(
        (i) => i.slug,
      ),
    ).toEqual(['pct'])
  })

  test('paginates at the resource level and reports the total', async () => {
    for (let n = 0; n < PAGE_SIZE + 2; n++) {
      const label = String(n).padStart(2, '0')
      await insertResource(`p-${label}`, [
        { locale: 'en', title: `Tool ${label}` },
      ])
    }

    const first = await listPublished('tool', 'en', { page: 1 })
    expect(first.total).toBe(PAGE_SIZE + 2)
    expect(first.items).toHaveLength(PAGE_SIZE)

    const second = await listPublished('tool', 'en', { page: 2 })
    expect(second.items).toHaveLength(2)
    // No overlap between pages.
    const firstIds = new Set(first.items.map((i) => i.id))
    expect(second.items.every((i) => !firstIds.has(i.id))).toBe(true)
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

  test('chapterCount ignores chapters of courses a visitor cannot reach', async () => {
    // The publish action refuses to publish without a translation, but the
    // schema does not enforce it — so the query must not assume it.
    const orphan = await insertResource('orphan-course', [], {
      type: 'course',
    })
    await db.insert(courseChapters).values({ courseId: orphan, position: 1 })

    const overview = await getHomeOverview('en')
    expect(overview.sections.course.count).toBe(0)
    expect(overview.chapterCount).toBe(0)
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
    const chapters = await db
      .insert(courseChapters)
      .values([
        { courseId: published, position: 1 },
        { courseId: published, position: 2 },
        { courseId: draft, position: 1 },
      ])
      .returning({ id: courseChapters.id })
    // Translate every chapter so the count turns purely on course status.
    await db.insert(courseChapterTranslations).values(
      chapters.map((c) => ({
        chapterId: c.id,
        locale: 'en' as const,
        title: 'Ch',
      })),
    )

    expect((await getHomeOverview('en')).chapterCount).toBe(2)
  })

  test('chapterCount ignores untranslated chapters a visitor cannot open', async () => {
    // Matches groupChapters/listChapters, which drop untranslated chapters:
    // the landing must not claim more chapters than the course page lists.
    const course = await insertResource(
      'partly-translated',
      [{ locale: 'en', title: 'Course' }],
      { type: 'course' },
    )
    const [translated, untranslated] = await db
      .insert(courseChapters)
      .values([
        { courseId: course, position: 1 },
        { courseId: course, position: 2 },
      ])
      .returning({ id: courseChapters.id })
    await db.insert(courseChapterTranslations).values({
      chapterId: translated.id,
      locale: 'en',
      title: 'Reachable',
    })
    void untranslated

    expect((await getHomeOverview('en')).chapterCount).toBe(1)
    expect(await listChapters(course, 'en')).toHaveLength(1)
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
