'use server'

import { and, asc, eq, max, ne } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'
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
import { metaSchemas, type ResourceType } from '@/lib/resource-meta'
import { requireAdmin } from '@/lib/session'

export type ActionState = { ok?: boolean; error?: string }

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case')

const localeSchema = z.enum(['en', 'zh'])
const typeSchema = z.enum(['tool', 'course', 'video', 'model_api'])

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function optional(value: string): string | undefined {
  return value === '' ? undefined : value
}

// Builds the candidate meta object from type-specific form fields, then
// validates it against the zod schema for that resource type.
function parseMeta(
  type: ResourceType,
  formData: FormData,
): { meta?: Record<string, unknown>; error?: string } {
  let candidate: Record<string, unknown>
  switch (type) {
    case 'tool':
      candidate = {
        url: optional(formString(formData, 'url')),
        docsUrl: optional(formString(formData, 'docsUrl')),
      }
      break
    case 'video':
      candidate = {
        provider: formString(formData, 'provider'),
        embedUrl: formString(formData, 'embedUrl'),
        duration: optional(formString(formData, 'duration')),
      }
      break
    case 'model_api':
      candidate = {
        provider: optional(formString(formData, 'provider')),
        docsUrl: optional(formString(formData, 'docsUrl')),
        endpoint: optional(formString(formData, 'endpoint')),
        links: formString(formData, 'links')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [label, ...rest] = line.split('|')
            return { label: label?.trim() ?? '', url: rest.join('|').trim() }
          }),
      }
      break
    case 'course': {
      const hours = formString(formData, 'estimatedHours')
      candidate = {
        level: optional(formString(formData, 'level')),
        estimatedHours: hours === '' ? undefined : Number(hours),
      }
      break
    }
  }

  const parsed = metaSchemas[type].safeParse(candidate)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    return { error: message }
  }
  return { meta: parsed.data }
}

// ---------- Resources ----------

export async function createResource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()

  const type = typeSchema.safeParse(formString(formData, 'type'))
  const slug = slugSchema.safeParse(formString(formData, 'slug'))
  if (!type.success || !slug.success) {
    return { error: slug.success ? 'Invalid type' : 'Slug must be kebab-case' }
  }

  const existing = await db
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.type, type.data), eq(resources.slug, slug.data)))
    .limit(1)
  if (existing.length > 0) {
    return { error: 'A resource of this type with this slug already exists' }
  }

  const [created] = await db
    .insert(resources)
    .values({ type: type.data, slug: slug.data })
    .returning({ id: resources.id })

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

  const title = formString(formData, 'title')
  if (!title) return { error: 'Title is required' }

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

  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1)
  if (!resource) return { error: 'Resource not found' }

  const slug = slugSchema.safeParse(formString(formData, 'slug'))
  if (!slug.success) return { error: 'Slug must be kebab-case' }

  const status =
    formString(formData, 'status') === 'published' ? 'published' : 'draft'
  if (status === 'published') {
    const translationCount = await db.$count(
      resourceTranslations,
      eq(resourceTranslations.resourceId, resourceId),
    )
    if (translationCount === 0) {
      return { error: 'Publishing requires at least one translation' }
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
    return { error: 'A resource of this type with this slug already exists' }
  }

  const tags = formString(formData, 'tags')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const { meta, error } = parseMeta(resource.type as ResourceType, formData)
  if (error) return { error }

  await db
    .update(resources)
    .set({ slug: slug.data, status, tags, meta, updatedAt: new Date() })
    .where(eq(resources.id, resourceId))

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

  const title = formString(formData, 'title')
  if (!title) return { error: 'Title is required' }

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
    return { error: 'Invalid email address' }
  }
  const role = formString(formData, 'role') === 'admin' ? 'admin' : 'member'

  await db.insert(invites).values({
    token: nanoid(32),
    email: email === '' ? null : email.toLowerCase(),
    role,
    invitedBy: session.user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

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

export async function toggleUserBan(userId: string): Promise<void> {
  const session = await requireAdmin()
  if (userId === session.user.id) return

  const [target] = await db
    .select({ banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  if (!target) return

  const banned = !target.banned
  await db.update(user).set({ banned }).where(eq(user.id, userId))
  if (banned) {
    // Kill live sessions so the ban takes effect immediately.
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId))
  }
  revalidatePath('/', 'layout')
}
