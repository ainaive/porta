import { and, arrayContains, asc, desc, eq, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import {
  courseChapters,
  courseChapterTranslations,
  resources,
  resourceTranslations,
} from '@/db/schema'
import type { Locale } from '@/i18n/routing'
import type { ResourceType } from '@/lib/resource-meta'

type ResourceRow = typeof resources.$inferSelect
type TranslationRow = typeof resourceTranslations.$inferSelect
type ChapterRow = typeof courseChapters.$inferSelect
type ChapterTranslationRow = typeof courseChapterTranslations.$inferSelect

export type TranslatedResource = ResourceRow & {
  title: string
  summary: string
  body: string
  // True when the requested locale has no translation and the other locale's
  // content is shown instead ("Untranslated" badge).
  isFallback: boolean
}

export type TranslatedChapter = ChapterRow & {
  title: string
  body: string
  isFallback: boolean
}

function pickTranslation<T extends { locale: string }>(
  rows: T[],
  locale: Locale,
): (T & { isFallback: boolean }) | null {
  const hit = rows.find((r) => r.locale === locale) ?? rows[0]
  return hit ? { ...hit, isFallback: hit.locale !== locale } : null
}

function groupResources(
  rows: { resource: ResourceRow; translation: TranslationRow | null }[],
  locale: Locale,
): TranslatedResource[] {
  const byId = new Map<
    string,
    { resource: ResourceRow; translations: TranslationRow[] }
  >()
  for (const { resource, translation } of rows) {
    const entry = byId.get(resource.id) ?? { resource, translations: [] }
    if (translation) entry.translations.push(translation)
    byId.set(resource.id, entry)
  }

  const result: TranslatedResource[] = []
  for (const { resource, translations } of byId.values()) {
    const picked = pickTranslation(translations, locale)
    // Resources without any translation never surface.
    if (!picked) continue
    result.push({
      ...resource,
      title: picked.title,
      summary: picked.summary,
      body: picked.body,
      isFallback: picked.isFallback,
    })
  }
  return result
}

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

export async function listLatest(
  locale: Locale,
  limit = 6,
): Promise<TranslatedResource[]> {
  const rows = await db
    .select({ resource: resources, translation: resourceTranslations })
    .from(resources)
    .leftJoin(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resources.id),
    )
    .where(eq(resources.status, 'published'))
    .orderBy(desc(resources.createdAt))

  return groupResources(rows, locale).slice(0, limit)
}

export async function getPublishedBySlug(
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
}

function groupChapters(
  rows: { chapter: ChapterRow; translation: ChapterTranslationRow | null }[],
  locale: Locale,
): TranslatedChapter[] {
  const byId = new Map<
    string,
    { chapter: ChapterRow; translations: ChapterTranslationRow[] }
  >()
  for (const { chapter, translation } of rows) {
    const entry = byId.get(chapter.id) ?? { chapter, translations: [] }
    if (translation) entry.translations.push(translation)
    byId.set(chapter.id, entry)
  }

  const result: TranslatedChapter[] = []
  for (const { chapter, translations } of byId.values()) {
    const picked = pickTranslation(translations, locale)
    if (!picked) continue
    result.push({
      ...chapter,
      title: picked.title,
      body: picked.body,
      isFallback: picked.isFallback,
    })
  }
  return result.sort((a, b) => a.position - b.position)
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
