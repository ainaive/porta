// Locale-fallback policy: content is shown in the requested locale when a
// translation exists, otherwise in the other locale flagged `isFallback`
// (rendered as an "Untranslated / 未翻译" badge). Rows with no translation at
// all are dropped entirely. Pure functions — the DB queries live in content.ts.
import type {
  courseChapters,
  courseChapterTranslations,
  resources,
  resourceTranslations,
} from '@/db/schema'
import type { Locale } from '@/i18n/routing'

export type ResourceRow = typeof resources.$inferSelect
export type TranslationRow = typeof resourceTranslations.$inferSelect
export type ChapterRow = typeof courseChapters.$inferSelect
export type ChapterTranslationRow =
  typeof courseChapterTranslations.$inferSelect

export type TranslatedResource = ResourceRow & {
  title: string
  summary: string
  body: string
  // True when the requested locale has no translation and the other locale's
  // content is shown instead.
  isFallback: boolean
}

export type TranslatedChapter = ChapterRow & {
  title: string
  body: string
  isFallback: boolean
}

export function pickTranslation<T extends { locale: string }>(
  rows: T[],
  locale: Locale,
): (T & { isFallback: boolean }) | null {
  const hit = rows.find((r) => r.locale === locale) ?? rows[0]
  return hit ? { ...hit, isFallback: hit.locale !== locale } : null
}

export function groupResources(
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
