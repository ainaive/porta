'use server'

import { asc, eq, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import {
  type ActionState,
  isForeignKeyViolation,
  localeSchema,
  submittedValues,
  uuidSchema,
} from '@/core/content/actions'
import { formString } from '@/core/content/meta'
import { db } from '@/db'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireAdmin } from '@/lib/session'
import { courseChapters, courseChapterTranslations } from './schema'

// Chapter mutations. Positions are dense 1..n and the URLs are positional,
// so reordering does a two-phase swap (to satisfy the unique (courseId,
// position) index) and deletion renumbers. Both are load-bearing — see
// docs/architecture.md.

export async function addChapter(courseId: string): Promise<void> {
  await requireAdmin()

  const [row] = await db
    .select({ maxPosition: max(courseChapters.position) })
    .from(courseChapters)
    .where(eq(courseChapters.courseId, courseId))
  const position = (row?.maxPosition ?? 0) + 1

  const [created] = await db
    .insert(courseChapters)
    .values({ courseId, position })
    .returning({ id: courseChapters.id })

  revalidatePath('/', 'layout')
  redirect({
    href: `/admin/resources/${courseId}/chapters/${created.id}`,
    locale: await getLocale(),
  })
}

export async function saveChapterTranslation(
  chapterId: string,
  locale: Locale,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()
  localeSchema.parse(locale)
  if (!uuidSchema.safeParse(chapterId).success) {
    return { error: 'resourceNotFound' }
  }

  const title = formString(formData, 'title')
  if (!title) {
    return { error: 'titleRequired', values: submittedValues(formData) }
  }

  try {
    await db
      .insert(courseChapterTranslations)
      .values({ chapterId, locale, title, body: formString(formData, 'body') })
      .onConflictDoUpdate({
        target: [
          courseChapterTranslations.chapterId,
          courseChapterTranslations.locale,
        ],
        set: { title, body: formString(formData, 'body') },
      })
  } catch (e) {
    if (isForeignKeyViolation(e)) return { error: 'resourceNotFound' }
    throw e
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function moveChapter(
  chapterId: string,
  direction: 'up' | 'down',
): Promise<void> {
  await requireAdmin()

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(courseChapters)
      .where(eq(courseChapters.id, chapterId))
      .limit(1)
    if (!current) return

    const siblings = await tx
      .select()
      .from(courseChapters)
      .where(eq(courseChapters.courseId, current.courseId))
      .orderBy(asc(courseChapters.position))
    const index = siblings.findIndex((c) => c.id === chapterId)
    const swapWith = siblings[direction === 'up' ? index - 1 : index + 1]
    if (!swapWith) return

    // Two-phase swap to satisfy the unique (courseId, position) constraint.
    await tx
      .update(courseChapters)
      .set({ position: 0 })
      .where(eq(courseChapters.id, current.id))
    await tx
      .update(courseChapters)
      .set({ position: current.position })
      .where(eq(courseChapters.id, swapWith.id))
    await tx
      .update(courseChapters)
      .set({ position: swapWith.position })
      .where(eq(courseChapters.id, current.id))
  })

  revalidatePath('/', 'layout')
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await requireAdmin()

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(courseChapters)
      .where(eq(courseChapters.id, chapterId))
      .limit(1)
    if (!current) return

    await tx.delete(courseChapters).where(eq(courseChapters.id, chapterId))

    // Renumber sequentially so chapter URLs (/courses/slug/N) stay dense.
    const remaining = await tx
      .select()
      .from(courseChapters)
      .where(eq(courseChapters.courseId, current.courseId))
      .orderBy(asc(courseChapters.position))
    for (const [offset, chapter] of remaining.entries()) {
      await tx
        .update(courseChapters)
        .set({ position: 1000 + offset })
        .where(eq(courseChapters.id, chapter.id))
    }
    for (const [offset, chapter] of remaining.entries()) {
      await tx
        .update(courseChapters)
        .set({ position: offset + 1 })
        .where(eq(courseChapters.id, chapter.id))
    }
  })

  revalidatePath('/', 'layout')
}
