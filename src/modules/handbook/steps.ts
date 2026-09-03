import { and, asc, count, eq, exists, sql } from 'drizzle-orm'
import { z } from 'zod'
import { pickTranslation } from '@/core/content/fallback'
import { db } from '@/db'
import { resources, resourceTranslations } from '@/db/schema'
import type { Locale } from '@/i18n/routing'
import {
  type StepRow,
  type StepTranslationRow,
  trackSteps,
  trackStepTranslations,
} from './schema'

// Step reads for the help module. The locale-fallback *policy* is core
// (`pickTranslation`); the shape it is applied to is this module's.

const uuidColumn = z.uuid()

export type TranslatedStep = StepRow & {
  title: string
  body: string
  isFallback: boolean
}

export function groupSteps(
  rows: { step: StepRow; translation: StepTranslationRow | null }[],
  locale: Locale,
): TranslatedStep[] {
  const byId = new Map<
    string,
    { step: StepRow; translations: StepTranslationRow[] }
  >()
  for (const { step, translation } of rows) {
    const entry = byId.get(step.id) ?? { step, translations: [] }
    if (translation) entry.translations.push(translation)
    byId.set(step.id, entry)
  }

  const result: TranslatedStep[] = []
  for (const { step, translations } of byId.values()) {
    const picked = pickTranslation(translations, locale)
    if (!picked) continue
    result.push({
      ...step,
      title: picked.title,
      body: picked.body,
      isFallback: picked.isFallback,
    })
  }
  return result.sort((a, b) => a.position - b.position)
}

export async function listSteps(
  trackId: string,
  locale: Locale,
): Promise<TranslatedStep[]> {
  const rows = await db
    .select({ step: trackSteps, translation: trackStepTranslations })
    .from(trackSteps)
    .leftJoin(
      trackStepTranslations,
      eq(trackStepTranslations.stepId, trackSteps.id),
    )
    .where(eq(trackSteps.trackId, trackId))
    .orderBy(asc(trackSteps.position))

  return groupSteps(rows, locale)
}

// Every facet of "reachable" applied here rather than inherited: a draft
// course's steps must not inflate a public number, nor an untranslated
// course's (groupResources drops it from the course count), nor an
// untranslated *step* (groupSteps drops it from listSteps, so the
// course page never lists it and its position 404s). The publish action
// refuses to publish an untranslated course, but nothing in the schema
// enforces either rule, so this query does not lean on them.
export async function countPublishedSteps(): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(trackSteps)
    .innerJoin(resources, eq(resources.id, trackSteps.trackId))
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
            .from(trackStepTranslations)
            .where(eq(trackStepTranslations.stepId, trackSteps.id)),
        ),
      ),
    )
  return rows[0]?.value ?? 0
}

// ---------- Admin queries (callers must requireAdmin() first) ----------

export async function adminListSteps(trackId: string): Promise<
  {
    step: StepRow
    translations: Partial<Record<Locale, StepTranslationRow>>
  }[]
> {
  if (!uuidColumn.safeParse(trackId).success) return []
  const rows = await db
    .select({ step: trackSteps, translation: trackStepTranslations })
    .from(trackSteps)
    .leftJoin(
      trackStepTranslations,
      eq(trackStepTranslations.stepId, trackSteps.id),
    )
    .where(eq(trackSteps.trackId, trackId))
    .orderBy(asc(trackSteps.position))

  const byId = new Map<
    string,
    {
      step: StepRow
      translations: Partial<Record<Locale, StepTranslationRow>>
    }
  >()
  for (const { step, translation } of rows) {
    const entry = byId.get(step.id) ?? { step, translations: {} }
    if (translation)
      entry.translations[translation.locale as Locale] = translation
    byId.set(step.id, entry)
  }
  return [...byId.values()].sort((a, b) => a.step.position - b.step.position)
}
