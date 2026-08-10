import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { cache } from 'react'
import { z } from 'zod'
import { db } from '@/db'
import {
  courseChapters,
  courseChapterTranslations,
  resources,
  resourceTranslations,
} from '@/db/schema'
import type { Locale } from '@/i18n/routing'
import {
  type ChapterRow,
  type ChapterTranslationRow,
  groupChapters,
  groupResources,
  pickTranslation,
  type ResourceRow,
  type TranslatedChapter,
  type TranslatedResource,
  type TranslationRow,
} from '@/lib/fallback'
import { type ResourceType, resourceTypes } from '@/lib/resource-meta'

export type { TranslatedChapter, TranslatedResource } from '@/lib/fallback'

const uuidColumn = z.uuid()

export const PAGE_SIZE = 24

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// A literal % or _ in the user's query must match itself, not act as a
// wildcard; backslash is Postgres LIKE's default escape.
function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, '\\$&')}%`
}

export async function listPublished(
  type: ResourceType,
  locale: Locale,
  filters: { q?: string; tag?: string; page?: number } = {},
): Promise<Paginated<TranslatedResource>> {
  const pageSize = PAGE_SIZE
  const requested = filters.page ?? 1
  const page =
    Number.isFinite(requested) && requested >= 1 ? Math.trunc(requested) : 1

  const conditions: SQL[] = [
    eq(resources.type, type),
    eq(resources.status, 'published'),
  ]
  if (filters.tag) conditions.push(arrayContains(resources.tags, [filters.tag]))
  if (filters.q) {
    // Match a resource when any of its translations (either locale) contains
    // the query in title, summary, or body — searched in SQL, not after a
    // full fetch, and no longer blind to the body.
    const pattern = likePattern(filters.q)
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(resourceTranslations)
          .where(
            and(
              eq(resourceTranslations.resourceId, resources.id),
              or(
                ilike(resourceTranslations.title, pattern),
                ilike(resourceTranslations.summary, pattern),
                ilike(resourceTranslations.body, pattern),
              ),
            ),
          ),
      ),
    )
  }
  const where = and(...conditions)

  const [{ total }] = await db
    .select({ total: count() })
    .from(resources)
    .where(where)

  // Paginate at the resource level (a resource fans out to one row per
  // translation in the join below, so LIMIT there would slice rows, not
  // resources): pick the page's ids first, then hydrate their translations.
  // desc(id) is the tiebreaker: created_at is not unique (a bulk insert shares
  // one transaction's now()), and without a stable secondary key Postgres may
  // order ties differently between the page-id and hydration queries, so a
  // resource could land on two pages or none.
  const pageIds = await db
    .select({ id: resources.id })
    .from(resources)
    .where(where)
    .orderBy(desc(resources.createdAt), desc(resources.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  const ids = pageIds.map((r) => r.id)
  if (ids.length === 0) return { items: [], total, page, pageSize }

  const rows = await db
    .select({ resource: resources, translation: resourceTranslations })
    .from(resources)
    .leftJoin(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resources.id),
    )
    .where(inArray(resources.id, ids))
    .orderBy(desc(resources.createdAt), desc(resources.id))

  return { items: groupResources(rows, locale), total, page, pageSize }
}

export async function listPublishedTags(type: ResourceType): Promise<string[]> {
  const rows = await db
    .select({ tags: resources.tags })
    .from(resources)
    .where(and(eq(resources.type, type), eq(resources.status, 'published')))
  return [...new Set(rows.flatMap((r) => r.tags))].sort()
}

export type HomeSection = {
  // Every publicly visible resource of this type, not just the preview.
  count: number
  items: TranslatedResource[]
}

export type HomeOverview = {
  latest: TranslatedResource[]
  sections: Record<ResourceType, HomeSection>
  tags: string[]
  chapterCount: number
}

const SECTION_PREVIEW_LIMIT = 3

// Everything the landing page needs, in two queries. The page shows counts,
// per-section previews and a tag cloud alongside the latest additions, and
// they all derive from the same set of published-and-translated resources —
// splitting them into separate calls would re-run the same scan four times.
export async function getHomeOverview(
  locale: Locale,
  latestLimit = 6,
): Promise<HomeOverview> {
  const [rows, chapterRows] = await Promise.all([
    db
      .select({ resource: resources, translation: resourceTranslations })
      .from(resources)
      .leftJoin(
        resourceTranslations,
        eq(resourceTranslations.resourceId, resources.id),
      )
      .where(eq(resources.status, 'published'))
      .orderBy(desc(resources.createdAt)),
    // Every facet of "reachable" applied here rather than inherited: a draft
    // course's chapters must not inflate a public number, nor an untranslated
    // course's (groupResources drops it from the course count below), nor an
    // untranslated *chapter* (groupChapters drops it from listChapters, so the
    // course page never lists it and its position 404s). The publish action
    // refuses to publish an untranslated course, but nothing in the schema
    // enforces either rule, so this query does not lean on them.
    db
      .select({ value: count() })
      .from(courseChapters)
      .innerJoin(resources, eq(resources.id, courseChapters.courseId))
      .where(
        and(
          eq(resources.status, 'published'),
          exists(
            db
              .select({ one: sql`1` })
              .from(resourceTranslations)
              .where(eq(resourceTranslations.resourceId, resources.id)),
          ),
          exists(
            db
              .select({ one: sql`1` })
              .from(courseChapterTranslations)
              .where(
                eq(courseChapterTranslations.chapterId, courseChapters.id),
              ),
          ),
        ),
      ),
  ])

  // groupResources drops resources with no translation at all, so counts and
  // tags below describe what a visitor can actually reach.
  const published = groupResources(rows, locale)

  const sections = Object.fromEntries(
    resourceTypes.map((type) => {
      const items = published.filter((item) => item.type === type)
      return [
        type,
        { count: items.length, items: items.slice(0, SECTION_PREVIEW_LIMIT) },
      ]
    }),
  ) as Record<ResourceType, HomeSection>

  return {
    latest: published.slice(0, latestLimit),
    sections,
    tags: [...new Set(published.flatMap((item) => item.tags))].sort(),
    chapterCount: chapterRows[0]?.value ?? 0,
  }
}

// React-cached so a page and its generateMetadata share one query.
export const getPublishedBySlug = cache(async function getPublishedBySlug(
  type: ResourceType,
  slug: string,
  locale: Locale,
): Promise<TranslatedResource | null> {
  const rows = await db
    .select({ resource: resources, translation: resourceTranslations })
    .from(resources)
    .leftJoin(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resources.id),
    )
    .where(
      and(
        eq(resources.type, type),
        eq(resources.slug, slug),
        eq(resources.status, 'published'),
      ),
    )

  return groupResources(rows, locale)[0] ?? null
})

// ---------- Admin queries (callers must requireAdmin() first) ----------

export async function adminListResources(
  locale: Locale,
  filters: {
    type?: ResourceType
    status?: 'draft' | 'published'
    page?: number
  } = {},
): Promise<Paginated<TranslatedResource>> {
  const pageSize = PAGE_SIZE
  const requested = filters.page ?? 1
  const page =
    Number.isFinite(requested) && requested >= 1 ? Math.trunc(requested) : 1
  const conditions: SQL[] = []
  if (filters.type) conditions.push(eq(resources.type, filters.type))
  if (filters.status) conditions.push(eq(resources.status, filters.status))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: count() })
    .from(resources)
    .where(where)

  // Resource-level page (see listPublished), with desc(id) as the stable
  // tiebreaker for equal updatedAt.
  const pageIds = await db
    .select({ id: resources.id })
    .from(resources)
    .where(where)
    .orderBy(desc(resources.updatedAt), desc(resources.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  const ids = pageIds.map((r) => r.id)
  if (ids.length === 0) return { items: [], total, page, pageSize }

  const rows = await db
    .select({ resource: resources, translation: resourceTranslations })
    .from(resources)
    .leftJoin(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resources.id),
    )
    .where(inArray(resources.id, ids))
    .orderBy(desc(resources.updatedAt), desc(resources.id))

  // Untranslated resources must still appear in the admin list, so group
  // manually instead of via groupResources (which drops them).
  const byId = new Map<
    string,
    { resource: ResourceRow; translations: TranslationRow[] }
  >()
  for (const { resource, translation } of rows) {
    const entry = byId.get(resource.id) ?? { resource, translations: [] }
    if (translation) entry.translations.push(translation)
    byId.set(resource.id, entry)
  }

  const items = [...byId.values()].map(({ resource, translations }) => {
    const picked = pickTranslation(translations, locale)
    return {
      ...resource,
      title: picked?.title ?? '',
      summary: picked?.summary ?? '',
      body: picked?.body ?? '',
      isFallback: picked?.isFallback ?? false,
    }
  })
  return { items, total, page, pageSize }
}

export async function adminGetResource(id: string): Promise<{
  resource: ResourceRow
  translations: Partial<Record<Locale, TranslationRow>>
} | null> {
  // A non-uuid route param would throw 22P02 at Postgres; treat it as a miss
  // so the page notFound()s instead of 500ing.
  if (!uuidColumn.safeParse(id).success) return null
  const rows = await db
    .select({ resource: resources, translation: resourceTranslations })
    .from(resources)
    .leftJoin(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resources.id),
    )
    .where(eq(resources.id, id))

  if (rows.length === 0) return null
  const translations: Partial<Record<Locale, TranslationRow>> = {}
  for (const { translation } of rows) {
    if (translation) translations[translation.locale as Locale] = translation
  }
  return { resource: rows[0].resource, translations }
}

export async function adminListChapters(courseId: string): Promise<
  {
    chapter: ChapterRow
    translations: Partial<Record<Locale, ChapterTranslationRow>>
  }[]
> {
  if (!uuidColumn.safeParse(courseId).success) return []
  const rows = await db
    .select({ chapter: courseChapters, translation: courseChapterTranslations })
    .from(courseChapters)
    .leftJoin(
      courseChapterTranslations,
      eq(courseChapterTranslations.chapterId, courseChapters.id),
    )
    .where(eq(courseChapters.courseId, courseId))
    .orderBy(asc(courseChapters.position))

  const byId = new Map<
    string,
    {
      chapter: ChapterRow
      translations: Partial<Record<Locale, ChapterTranslationRow>>
    }
  >()
  for (const { chapter, translation } of rows) {
    const entry = byId.get(chapter.id) ?? { chapter, translations: {} }
    if (translation)
      entry.translations[translation.locale as Locale] = translation
    byId.set(chapter.id, entry)
  }
  return [...byId.values()].sort(
    (a, b) => a.chapter.position - b.chapter.position,
  )
}

export async function listChapters(
  courseId: string,
  locale: Locale,
): Promise<TranslatedChapter[]> {
  const rows = await db
    .select({ chapter: courseChapters, translation: courseChapterTranslations })
    .from(courseChapters)
    .leftJoin(
      courseChapterTranslations,
      eq(courseChapterTranslations.chapterId, courseChapters.id),
    )
    .where(eq(courseChapters.courseId, courseId))
    .orderBy(asc(courseChapters.position))

  return groupChapters(rows, locale)
}
