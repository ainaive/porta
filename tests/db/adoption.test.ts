import { beforeEach, describe, expect, test } from 'bun:test'
import { getAdoptionStats } from '@/core/content/queries'
import { db } from '@/db'
import { resources, resourceTranslations } from '@/db/schema'
import { resetDb } from './harness'

// The Adoption page reports the catalog, not usage: there is no telemetry
// source, and inventing one is the failure ADR 0008 exists to prevent. What
// these cover is that the numbers mean what the page says they mean.

async function publish(
  slug: string,
  type: 'tool' | 'doc' | 'track' | 'event',
  locales: ('en' | 'zh')[],
  overrides: Partial<typeof resources.$inferInsert> = {},
): Promise<void> {
  const [row] = await db
    .insert(resources)
    .values({ type, slug, status: 'published', ...overrides })
    .returning({ id: resources.id })
  if (locales.length > 0) {
    await db.insert(resourceTranslations).values(
      locales.map((locale) => ({
        resourceId: row.id,
        locale,
        title: `${slug} ${locale}`,
      })),
    )
  }
}

beforeEach(resetDb)

describe('getAdoptionStats', () => {
  test('counts published resources per section', async () => {
    await publish('a', 'tool', ['en'])
    await publish('b', 'tool', ['en', 'zh'])
    await publish('c', 'doc', ['zh'])

    const stats = await getAdoptionStats()
    const bySection = Object.fromEntries(
      stats.sections.map((s) => [s.type, s.published]),
    )
    expect(bySection.tool).toBe(2)
    expect(bySection.doc).toBe(1)
    expect(stats.published).toBe(3)
  })

  test('every registered section appears, even with nothing published', async () => {
    await publish('a', 'tool', ['en'])
    const stats = await getAdoptionStats()
    expect(stats.sections.map((s) => s.type)).toContain('event')
    expect(stats.sections.find((s) => s.type === 'event')?.published).toBe(0)
  })

  test('bilingual counts only resources carrying both locales', async () => {
    await publish('one-locale', 'tool', ['en'])
    await publish('both', 'tool', ['en', 'zh'])

    const stats = await getAdoptionStats()
    expect(stats.bilingual).toBe(1)
    expect(stats.sections.find((s) => s.type === 'tool')?.bilingual).toBe(1)
  })

  test('drafts and untranslated rows count towards nothing', async () => {
    await publish('draft', 'tool', ['en', 'zh'], { status: 'draft' })
    // Published but renderable in no locale — the listing drops it, so
    // counting it here would report a resource nobody can reach.
    await publish('orphan', 'tool', [])
    await publish('real', 'tool', ['en'])

    const stats = await getAdoptionStats()
    expect(stats.published).toBe(1)
    expect(stats.bilingual).toBe(0)
  })

  test('tags are tallied across sections, most used first', async () => {
    await publish('a', 'tool', ['en'], { tags: ['cli', 'devops'] })
    await publish('b', 'doc', ['en'], { tags: ['cli'] })
    await publish('c', 'track', ['en'], { tags: ['onboarding'] })

    const stats = await getAdoptionStats()
    expect(stats.tags[0]).toEqual({ tag: 'cli', count: 2 })
    // Ties break alphabetically so the order is stable between requests.
    expect(stats.tags.slice(1).map((t) => t.tag)).toEqual([
      'devops',
      'onboarding',
    ])
  })
})
