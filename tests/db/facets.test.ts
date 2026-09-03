import { beforeEach, describe, expect, test } from 'bun:test'
import { listFacetCounts, listPublished } from '@/core/content/queries'
import { db } from '@/db'
import { resources, resourceTranslations } from '@/db/schema'
import { resetDb } from './harness'

// Facets are declared per section (`facets` on the manifest) and filtered in
// SQL against the `meta` jsonb. What only a database proves: that several
// values on one field are an OR, that different fields AND, and that the
// counts stay usable once a selection is active.

async function tool(
  slug: string,
  meta: Record<string, string>,
  title = slug,
): Promise<void> {
  const [row] = await db
    .insert(resources)
    .values({ type: 'tool', slug, status: 'published', meta })
    .returning({ id: resources.id })
  await db
    .insert(resourceTranslations)
    .values({ resourceId: row.id, locale: 'en', title })
}

const FIELDS = ['category', 'maturity', 'language'] as const

beforeEach(async () => {
  await resetDb()
  await tool('forge', { category: 'build', maturity: 'ga', language: 'go' })
  await tool('pipeline', { category: 'cicd', maturity: 'ga', language: 'go' })
  await tool('probe', {
    category: 'testing',
    maturity: 'beta',
    language: 'rust',
  })
  await tool('mocklab', {
    category: 'testing',
    maturity: 'ga',
    language: 'typescript',
  })
  // No facet values at all: a tool an admin has not classified yet must stay
  // reachable with no filter applied, and count towards nothing.
  await tool('unclassified', {})
})

describe('facet filtering', () => {
  test('several values on one field are an OR', async () => {
    const { items } = await listPublished('tool', 'en', {
      facets: { language: ['go', 'rust'] },
    })
    expect(items.map((i) => i.slug).sort()).toEqual([
      'forge',
      'pipeline',
      'probe',
    ])
  })

  test('different fields AND together', async () => {
    const { items } = await listPublished('tool', 'en', {
      facets: { language: ['go'], category: ['cicd'] },
    })
    expect(items.map((i) => i.slug)).toEqual(['pipeline'])
  })

  test('an unclassified resource is filtered out, not treated as a match', async () => {
    const { items } = await listPublished('tool', 'en', {
      facets: { maturity: ['ga'] },
    })
    expect(items.map((i) => i.slug)).not.toContain('unclassified')
  })

  test('no selection leaves the whole section visible', async () => {
    const { total } = await listPublished('tool', 'en', { facets: {} })
    expect(total).toBe(5)
  })

  test('facets narrow a free-text search rather than replacing it', async () => {
    // 'o' matches forge, probe and mocklab; only two of those are GA.
    const { items } = await listPublished('tool', 'en', {
      q: 'o',
      facets: { maturity: ['ga'] },
    })
    expect(items.map((i) => i.slug).sort()).toEqual(['forge', 'mocklab'])
  })
})

describe('facet counts', () => {
  test('count every value a section carries', async () => {
    const counts = await listFacetCounts('tool', FIELDS)
    expect(counts.language).toEqual({ go: 2, rust: 1, typescript: 1 })
    expect(counts.maturity).toEqual({ ga: 3, beta: 1 })
    expect(counts.category).toEqual({ build: 1, cicd: 1, testing: 2 })
  })

  test("a field's own selection does not collapse its own counts", async () => {
    // The point of excluding the active field from its own count: were it
    // included, picking Go would read `go 2` and every sibling `0`, and there
    // would be no way to see what widening the choice buys.
    const counts = await listFacetCounts('tool', FIELDS, {
      facets: { language: ['go'] },
    })
    expect(counts.language).toEqual({ go: 2, rust: 1, typescript: 1 })
  })

  test('but every other field narrows to that selection', async () => {
    const counts = await listFacetCounts('tool', FIELDS, {
      facets: { language: ['go'] },
    })
    expect(counts.maturity).toEqual({ ga: 2 })
    expect(counts.category).toEqual({ build: 1, cicd: 1 })
  })

  test('drafts and untranslated rows are counted by nobody', async () => {
    await db.insert(resources).values({
      type: 'tool',
      slug: 'draft-tool',
      status: 'draft',
      meta: { language: 'go' },
    })
    // Published but renderable in no locale — listPublished drops it, so
    // counting it would promise a result the listing cannot show.
    await db.insert(resources).values({
      type: 'tool',
      slug: 'orphan-tool',
      status: 'published',
      meta: { language: 'go' },
    })

    const counts = await listFacetCounts('tool', FIELDS)
    expect(counts.language.go).toBe(2)
  })
})
