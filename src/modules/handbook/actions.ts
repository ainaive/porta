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
import { trackSteps, trackStepTranslations } from './schema'

// Step mutations. Positions are dense 1..n and the URLs are positional,
// so reordering does a two-phase swap (to satisfy the unique (trackId,
// position) index) and deletion renumbers. Both are load-bearing — see
// docs/architecture.md.

export async function addStep(trackId: string): Promise<void> {
  await requireAdmin()

  const [row] = await db
    .select({ maxPosition: max(trackSteps.position) })
    .from(trackSteps)
    .where(eq(trackSteps.trackId, trackId))
  const position = (row?.maxPosition ?? 0) + 1

  const [created] = await db
    .insert(trackSteps)
    .values({ trackId, position })
    .returning({ id: trackSteps.id })

  revalidatePath('/', 'layout')
  redirect({
    href: `/admin/resources/${trackId}/steps/${created.id}`,
    locale: await getLocale(),
  })
}

export async function saveStepTranslation(
  stepId: string,
  locale: Locale,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()
  localeSchema.parse(locale)
  if (!uuidSchema.safeParse(stepId).success) {
    return { error: 'resourceNotFound' }
  }

  const title = formString(formData, 'title')
  if (!title) {
    return { error: 'titleRequired', values: submittedValues(formData) }
  }

  try {
    await db
      .insert(trackStepTranslations)
      .values({ stepId, locale, title, body: formString(formData, 'body') })
      .onConflictDoUpdate({
        target: [trackStepTranslations.stepId, trackStepTranslations.locale],
        set: { title, body: formString(formData, 'body') },
      })
  } catch (e) {
    if (isForeignKeyViolation(e)) return { error: 'resourceNotFound' }
    throw e
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function moveStep(
  stepId: string,
  direction: 'up' | 'down',
): Promise<void> {
  await requireAdmin()

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(trackSteps)
      .where(eq(trackSteps.id, stepId))
      .limit(1)
    if (!current) return

    const siblings = await tx
      .select()
      .from(trackSteps)
      .where(eq(trackSteps.trackId, current.trackId))
      .orderBy(asc(trackSteps.position))
    const index = siblings.findIndex((c) => c.id === stepId)
    const swapWith = siblings[direction === 'up' ? index - 1 : index + 1]
    if (!swapWith) return

    // Two-phase swap to satisfy the unique (trackId, position) constraint.
    await tx
      .update(trackSteps)
      .set({ position: 0 })
      .where(eq(trackSteps.id, current.id))
    await tx
      .update(trackSteps)
      .set({ position: current.position })
      .where(eq(trackSteps.id, swapWith.id))
    await tx
      .update(trackSteps)
      .set({ position: swapWith.position })
      .where(eq(trackSteps.id, current.id))
  })

  revalidatePath('/', 'layout')
}

export async function deleteStep(stepId: string): Promise<void> {
  await requireAdmin()

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(trackSteps)
      .where(eq(trackSteps.id, stepId))
      .limit(1)
    if (!current) return

    await tx.delete(trackSteps).where(eq(trackSteps.id, stepId))

    // Renumber sequentially so step URLs (/courses/slug/N) stay dense.
    const remaining = await tx
      .select()
      .from(trackSteps)
      .where(eq(trackSteps.trackId, current.trackId))
      .orderBy(asc(trackSteps.position))
    for (const [offset, step] of remaining.entries()) {
      await tx
        .update(trackSteps)
        .set({ position: 1000 + offset })
        .where(eq(trackSteps.id, step.id))
    }
    for (const [offset, step] of remaining.entries()) {
      await tx
        .update(trackSteps)
        .set({ position: offset + 1 })
        .where(eq(trackSteps.id, step.id))
    }
  })

  revalidatePath('/', 'layout')
}
