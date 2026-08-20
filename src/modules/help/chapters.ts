import { and, asc, count, eq, exists, sql } from 'drizzle-orm'
import { z } from 'zod'
import { pickTranslation } from '@/core/content/fallback'
import { db } from '@/db'
import { resources, resourceTranslations } from '@/db/schema'
import type { Locale } from '@/i18n/routing'
import {
  type ChapterRow,
  type ChapterTranslationRow,
  courseChapters,
  courseChapterTranslations,
} from './schema'

// Chapter reads for the help module. The locale-fallback *policy* is core
// (`pickTranslation`); the shape it is applied to is this module's.

const uuidColumn = z.uuid()

export type TranslatedChapter = ChapterRow & {
  title: string
  body: string
  isFallback: boolean
}

export function groupChapters(
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

// Every facet of "reachable" applied here rather than inherited: a draft
// course's chapters must not inflate a public number, nor an untranslated
// course's (groupResources drops it from the course count), nor an
// untranslated *chapter* (groupChapters drops it from listChapters, so the
// course page never lists it and its position 404s). The publish action
// refuses to publish an untranslated course, but nothing in the schema
// enforces either rule, so this query does not lean on them.
export async function countPublishedChapters(): Promise<number> {
  const rows = await db
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
            .where(eq(courseChapterTranslations.chapterId, courseChapters.id)),
        ),
      ),
    )
  return rows[0]?.value ?? 0
}

// ---------- Admin queries (callers must requireAdmin() first) ----------

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
