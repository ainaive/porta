import { and, arrayContains, asc, count, desc, eq, type SQL } from 'drizzle-orm'
import { cache } from 'react'
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

export async function listPublished(
  type: ResourceType,
  locale: Locale,
  filters: { q?: string; tag?: string } = {},
): Promise<TranslatedResource[]> {
  const conditions: SQL[] = [
    eq(resources.type, type),
    eq(resources.status, 'published'),
  ]
  if (filters.tag) conditions.push(arrayContains(resources.tags, [filters.tag]))

  const rows = await db
    .select({ resource: resources, translation: resourceTranslations })
    .from(resources)
    .leftJoin(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resources.id),
    )
    .where(and(...conditions))
    .orderBy(desc(resources.createdAt))

  let items = groupResources(rows, locale)
  if (filters.q) {
    const q = filters.q.toLowerCase()
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q),
    )
  }
  return items
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
    // Chapters of draft courses must not inflate a public number.
    db
      .select({ value: count() })
      .from(courseChapters)
      .innerJoin(resources, eq(resources.id, courseChapters.courseId))
      .where(eq(resources.status, 'published')),
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
  filters: { type?: ResourceType; status?: 'draft' | 'published' } = {},
): Promise<TranslatedResource[]> {
  const conditions: SQL[] = []
  if (filters.type) conditions.push(eq(resources.type, filters.type))
  if (filters.status) conditions.push(eq(resources.status, filters.status))

  const rows = await db
    .select({ resource: resources, translation: resourceTranslations })
    .from(resources)
    .leftJoin(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resources.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(resources.updatedAt))

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

  return [...byId.values()].map(({ resource, translations }) => {
    const picked = pickTranslation(translations, locale)
    return {
      ...resource,
      title: picked?.title ?? '',
      summary: picked?.summary ?? '',
      body: picked?.body ?? '',
      isFallback: picked?.isFallback ?? false,
    }
  })
}

export async function adminGetResource(id: string): Promise<{
  resource: ResourceRow
  translations: Partial<Record<Locale, TranslationRow>>
} | null> {
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
