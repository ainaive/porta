import { beforeEach, describe, expect, test } from 'bun:test'
import { getHomeOverview } from '@/core/content/queries'
import { db } from '@/db'
import { resources, resourceTranslations } from '@/db/schema'
import { trackSteps, trackStepTranslations } from '@/modules/handbook/schema'
import {
  adminListSteps,
  countPublishedSteps,
  listSteps,
} from '@/modules/handbook/steps'
import { resetDb } from './harness'

// Steps and the public step count belong to the help module; the
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

describe('countPublishedSteps', () => {
  test('ignores steps of courses a visitor cannot reach', async () => {
    // The publish action refuses to publish without a translation, but the
    // schema does not enforce it — so the query must not assume it.
    const orphan = await insertResource('orphan-course', [], {
      type: 'track',
    })
    await db.insert(trackSteps).values({ trackId: orphan, position: 1 })

    const overview = await getHomeOverview('en')
    expect(overview.sections.track.count).toBe(0)
    expect(await countPublishedSteps()).toBe(0)
  })

  test('ignores steps of unpublished courses', async () => {
    const published = await insertResource(
      'live-course',
      [{ locale: 'en', title: 'Live' }],
      { type: 'track' },
    )
    const draft = await insertResource(
      'draft-course',
      [{ locale: 'en', title: 'Draft' }],
      { type: 'track', status: 'draft' },
    )
    const steps = await db
      .insert(trackSteps)
      .values([
        { trackId: published, position: 1 },
        { trackId: published, position: 2 },
        { trackId: draft, position: 1 },
      ])
      .returning({ id: trackSteps.id })
    // Translate every step so the count turns purely on course status.
    await db.insert(trackStepTranslations).values(
      steps.map((c) => ({
        stepId: c.id,
        locale: 'en' as const,
        title: 'Ch',
      })),
    )

    expect(await countPublishedSteps()).toBe(2)
  })

  test('ignores untranslated steps a visitor cannot open', async () => {
    // Matches groupSteps/listSteps, which drop untranslated steps:
    // the landing must not claim more steps than the course page lists.
    const course = await insertResource(
      'partly-translated',
      [{ locale: 'en', title: 'Course' }],
      { type: 'track' },
    )
    const [translated, untranslated] = await db
      .insert(trackSteps)
      .values([
        { trackId: course, position: 1 },
        { trackId: course, position: 2 },
      ])
      .returning({ id: trackSteps.id })
    await db.insert(trackStepTranslations).values({
      stepId: translated.id,
      locale: 'en',
      title: 'Reachable',
    })
    void untranslated

    expect(await countPublishedSteps()).toBe(1)
    expect(await listSteps(course, 'en')).toHaveLength(1)
  })
})

describe('steps', () => {
  test('orders by position and applies per-step fallback', async () => {
    const trackId = await insertResource(
      'course-1',
      [{ locale: 'en', title: 'Course' }],
      { type: 'track' },
    )
    // Insert out of order to prove ordering comes from position.
    for (const position of [2, 1]) {
      const [ch] = await db
        .insert(trackSteps)
        .values({ trackId, position })
        .returning({ id: trackSteps.id })
      await db.insert(trackStepTranslations).values({
        stepId: ch.id,
        locale: position === 1 ? 'zh' : 'en',
        title: `Step ${position}`,
      })
    }

    const steps = await listSteps(trackId, 'en')
    expect(steps.map((c) => c.position)).toEqual([1, 2])
    expect(steps[0].isFallback).toBe(true)
    expect(steps[1].isFallback).toBe(false)

    const admin = await adminListSteps(trackId)
    expect(admin[0].translations.zh?.title).toBe('Step 1')
    expect(admin[0].translations.en).toBeUndefined()
  })
})
