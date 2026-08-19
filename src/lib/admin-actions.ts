'use server'

import { and, asc, eq, max, ne } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'
import {
  type ActionState,
  isForeignKeyViolation,
  isUniqueViolation,
  localeSchema,
  submittedValues,
  uuidSchema,
} from '@/core/content/actions'
import {
  formString,
  parseMeta,
  type ResourceType,
  resourceTypes,
  slugSchema,
} from '@/core/content/meta'
import { db } from '@/db'
import {
  courseChapters,
  courseChapterTranslations,
  invites,
  resources,
  resourceTranslations,
  session as sessionTable,
  user,
} from '@/db/schema'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { auth, canonicalBaseURL } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/session'

// Accepts exactly the sections the registry knows about, so an unregistered
// type can never reach the database.
const typeSchema = z.enum(
  resourceTypes as unknown as [ResourceType, ...ResourceType[]],
)

// Invite links are built by hand (they carry our own sign-up token, not a
// better-auth one), so resolve the same canonical origin better-auth uses for
// its emailed links — keeping invite and reset links pointed at one place.
function appBaseUrl(): string {
  return canonicalBaseURL() ?? ''
}

// ---------- Resources ----------

export async function createResource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin()

  const type = typeSchema.safeParse(formString(formData, 'type'))
  const slug = slugSchema.safeParse(formString(formData, 'slug'))
  if (!type.success || !slug.success) {
    return {
      error: slug.success ? 'typeInvalid' : 'slugFormat',
      values: submittedValues(formData),
    }
  }

  const existing = await db
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.type, type.data), eq(resources.slug, slug.data)))
    .limit(1)
  if (existing.length > 0) {
    return { error: 'slugTaken', values: submittedValues(formData) }
  }

  let created: { id: string }
  try {
    ;[created] = await db
      .insert(resources)
      .values({ type: type.data, slug: slug.data, createdBy: session.user.id })
      .returning({ id: resources.id })
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: 'slugTaken', values: submittedValues(formData) }
    }
    throw e
  }

  revalidatePath('/', 'layout')
  redirect({
    href: `/admin/resources/${created.id}`,
    locale: await getLocale(),
  })
  return { ok: true }
}

export async function saveTranslation(
  resourceId: string,
  locale: Locale,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()
  localeSchema.parse(locale)
  if (!uuidSchema.safeParse(resourceId).success) {
    return { error: 'resourceNotFound' }
  }

  const title = formString(formData, 'title')
  if (!title) {
    return { error: 'titleRequired', values: submittedValues(formData) }
  }

  try {
    await db
      .insert(resourceTranslations)
      .values({
        resourceId,
        locale,
        title,
        summary: formString(formData, 'summary'),
        body: formString(formData, 'body'),
      })
      .onConflictDoUpdate({
        target: [resourceTranslations.resourceId, resourceTranslations.locale],
        set: {
          title,
          summary: formString(formData, 'summary'),
          body: formString(formData, 'body'),
        },
      })
  } catch (e) {
    if (isForeignKeyViolation(e)) return { error: 'resourceNotFound' }
    throw e
  }

  await db
    .update(resources)
    .set({ updatedAt: new Date() })
    .where(eq(resources.id, resourceId))

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function saveSettings(
  resourceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()
  if (!uuidSchema.safeParse(resourceId).success) {
    return { error: 'resourceNotFound' }
  }

  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1)
  if (!resource) return { error: 'resourceNotFound' }

  const slug = slugSchema.safeParse(formString(formData, 'slug'))
  if (!slug.success) {
    return { error: 'slugFormat', values: submittedValues(formData) }
  }

  const status =
    formString(formData, 'status') === 'published' ? 'published' : 'draft'
  if (status === 'published') {
    const translationCount = await db.$count(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resourceId),
    )
    if (translationCount === 0) {
      return {
        error: 'publishNeedsTranslation',
        values: submittedValues(formData),
      }
    }
  }

  const clash = await db
    .select({ id: resources.id })
    .from(resources)
    .where(
      and(
        eq(resources.type, resource.type),
        eq(resources.slug, slug.data),
        ne(resources.id, resourceId),
      ),
    )
    .limit(1)
  if (clash.length > 0) {
    return { error: 'slugTaken', values: submittedValues(formData) }
  }

  const tags = formString(formData, 'tags')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const { meta, error } = parseMeta(resource.type as ResourceType, formData)
  if (error) {
    return {
      error: 'metaInvalid',
      detail: error,
      values: submittedValues(formData),
    }
  }

  try {
    await db
      .update(resources)
      .set({ slug: slug.data, status, tags, meta, updatedAt: new Date() })
      .where(eq(resources.id, resourceId))
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: 'slugTaken', values: submittedValues(formData) }
    }
    throw e
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteResource(resourceId: string): Promise<void> {
  await requireAdmin()
  await db.delete(resources).where(eq(resources.id, resourceId))
  revalidatePath('/', 'layout')
  redirect({ href: '/admin/resources', locale: await getLocale() })
}

// ---------- Course chapters ----------

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

// ---------- Invites ----------

export async function createInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin()

  const email = formString(formData, 'email')
  if (email !== '' && !z.email().safeParse(email).success) {
    return { error: 'emailInvalid', values: submittedValues(formData) }
  }
  const role = formString(formData, 'role') === 'admin' ? 'admin' : 'member'

  const token = nanoid(32)
  await db.insert(invites).values({
    token,
    email: email === '' ? null : email.toLowerCase(),
    role,
    invitedBy: session.user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  // Email the link when the invite is addressed to someone (open invites are
  // copy-link only). Copy-link still works either way — and if there's no
  // absolute base URL, skip the email rather than send an unresolvable
  // relative link.
  const base = appBaseUrl()
  if (email !== '' && base) {
    const url = `${base}/${await getLocale()}/sign-up?token=${token}`
    await sendEmail({
      to: email.toLowerCase(),
      subject: "You've been invited · 邀请你加入",
      text: `You've been invited to join. Sign up: ${url}\n\n你被邀请加入。注册：${url}`,
      html: `<p>You've been invited to join / 你被邀请加入:</p><p><a href="${url}">${url}</a></p>`,
    })
  } else if (email !== '') {
    logger.error(
      'invite email skipped: no absolute base URL (set BETTER_AUTH_URL)',
    )
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteInvite(inviteId: string): Promise<void> {
  await requireAdmin()
  await db.delete(invites).where(eq(invites.id, inviteId))
  revalidatePath('/', 'layout')
}

// ---------- Users ----------

export async function setUserRole(
  userId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin()
  // Admins cannot change their own role — prevents locking yourself out.
  if (userId === session.user.id) return

  const role = formString(formData, 'role') === 'admin' ? 'admin' : 'member'
  await db.update(user).set({ role }).where(eq(user.id, userId))
  revalidatePath('/', 'layout')
}

// Admin-triggered recovery for a member who can't self-serve: sends the same
// password-reset email the forgot-password flow does. Same non-committal
// response whether or not the user exists.
export async function sendUserResetEmail(userId: string): Promise<void> {
  await requireAdmin()
  const [target] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  if (!target) return

  await auth.api.requestPasswordReset({
    body: {
      email: target.email,
      // Relative: better-auth resolves it against its canonical base URL, so the
      // callback stays same-origin as the emailed link (see forgot-password-form).
      redirectTo: `/${await getLocale()}/reset-password`,
    },
    headers: await headers(),
  })
}

export async function toggleUserBan(userId: string): Promise<void> {
  const session = await requireAdmin()
  if (userId === session.user.id) return

  // One transaction, row locked: the flag and the session purge land
  // together, and two concurrent toggles serialize instead of computing
  // the same flip.
  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ banned: user.banned })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .for('update')
    if (!target) return

    const banned = !target.banned
    await tx.update(user).set({ banned }).where(eq(user.id, userId))
    if (banned) {
      // Kill live sessions so the ban takes effect immediately.
      await tx.delete(sessionTable).where(eq(sessionTable.userId, userId))
    }
  })
  revalidatePath('/', 'layout')
}
