import { beforeEach, describe, expect, test } from 'bun:test'
import { getHomeOverview } from '@/core/content/queries'
import { db } from '@/db'
import { resources, resourceTranslations } from '@/db/schema'
import {
  adminListChapters,
  countPublishedChapters,
  listChapters,
} from '@/modules/help/chapters'
import {
  courseChapters,
  courseChapterTranslations,
} from '@/modules/help/schema'
import { resetDb } from './harness'

// Chapters and the public chapter count belong to the help module; the
// generic resource queries they lean on are covered in content.test.ts.

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

describe('countPublishedChapters', () => {
  test('ignores chapters of courses a visitor cannot reach', async () => {
    // The publish action refuses to publish without a translation, but the
    // schema does not enforce it — so the query must not assume it.
    const orphan = await insertResource('orphan-course', [], {
      type: 'course',
    })
    await db.insert(courseChapters).values({ courseId: orphan, position: 1 })

    const overview = await getHomeOverview('en')
    expect(overview.sections.course.count).toBe(0)
    expect(await countPublishedChapters()).toBe(0)
  })

  test('ignores chapters of unpublished courses', async () => {
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

    expect(await countPublishedChapters()).toBe(2)
  })

  test('ignores untranslated chapters a visitor cannot open', async () => {
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

    expect(await countPublishedChapters()).toBe(1)
    expect(await listChapters(course, 'en')).toHaveLength(1)
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
