// Exercises the server actions against a real database. requireAdmin/
// requireSession and next/cache's revalidatePath need a request scope that
// bun test has no way to provide, so they are module-mocked: a mutable
// `denied` flag lets the same suite prove both the happy path (reorder/
// renumber contracts) and the gate (every mutation rejects a non-admin and
// touches nothing). mock.module must run before admin-actions is imported,
// hence the dynamic import below.
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { invites, resources } from '@/db/schema'
import { courseChapters } from '@/modules/help/schema'
import { resetDb } from './harness'

const FAKE_ADMIN = {
  user: { id: '00000000-0000-4000-8000-000000000001', role: 'admin' },
}
let denied = false

mock.module('@/lib/session', () => ({
  requireAdmin: async () => {
    if (denied) throw new Error('DENIED')
    return FAKE_ADMIN
  },
  requireSession: async () => {
    if (denied) throw new Error('DENIED')
    return FAKE_ADMIN
  },
  getSession: async () => (denied ? null : FAKE_ADMIN),
}))
mock.module('next/cache', () => ({ revalidatePath: () => {} }))

const {
  createResource,
  saveTranslation,
  saveSettings,
  deleteResource,
  createInvite,
  deleteInvite,
  sendUserResetEmail,
  setUserRole,
  toggleUserBan,
} = await import('@/lib/admin-actions')
// Chapter mutations moved to the help module, but they are gated by the
// same mocked requireAdmin, so they stay in this suite's contract.
const { addChapter, saveChapterTranslation, moveChapter, deleteChapter } =
  await import('@/modules/help/actions')

async function seedChapters(
  positions: number[],
): Promise<{ courseId: string; ids: string[] }> {
  const [course] = await db
    .insert(resources)
    .values({ type: 'course', slug: 'contract-course', status: 'published' })
    .returning({ id: resources.id })
  const ids: string[] = []
  for (const position of positions) {
    const [ch] = await db
      .insert(courseChapters)
      .values({ courseId: course.id, position })
      .returning({ id: courseChapters.id })
    ids.push(ch.id)
  }
  return { courseId: course.id, ids }
}

async function orderedIds(courseId: string): Promise<string[]> {
  const rows = await db
    .select({ id: courseChapters.id, position: courseChapters.position })
    .from(courseChapters)
    .where(eq(courseChapters.courseId, courseId))
    .orderBy(asc(courseChapters.position))
  // Positions must be dense 1..n at all times.
  expect(rows.map((r) => r.position)).toEqual(rows.map((_, i) => i + 1))
  return rows.map((r) => r.id)
}

beforeEach(async () => {
  await resetDb()
  denied = false
})

describe('chapter ordering contracts', () => {
  test('moveChapter up swaps with the previous sibling', async () => {
    const { courseId, ids } = await seedChapters([1, 2, 3])
    const [a, b, c] = ids
    await moveChapter(b, 'up')
    expect(await orderedIds(courseId)).toEqual([b, a, c])
  })

  test('moveChapter down swaps with the next sibling', async () => {
    const { courseId, ids } = await seedChapters([1, 2, 3])
    const [a, b, c] = ids
    await moveChapter(b, 'down')
    expect(await orderedIds(courseId)).toEqual([a, c, b])
  })

  test('moveChapter no-ops at the boundaries', async () => {
    const { courseId, ids } = await seedChapters([1, 2, 3])
    const [a, , c] = ids
    await moveChapter(a, 'up')
    expect(await orderedIds(courseId)).toEqual(ids)
    await moveChapter(c, 'down')
    expect(await orderedIds(courseId)).toEqual(ids)
  })

  test('deleteChapter renumbers survivors to a dense 1..n', async () => {
    const { courseId, ids } = await seedChapters([1, 2, 3, 4])
    const [a, b, c, d] = ids
    await deleteChapter(b)
    // orderedIds asserts density; the ids prove which rows survived and in
    // what order.
    expect(await orderedIds(courseId)).toEqual([a, c, d])
  })
})

describe('input validation returns handled errors, not 500s', () => {
  test('a malformed id resolves to resourceNotFound, not a Postgres 22P02', async () => {
    const f = new FormData()
    f.set('title', 'x')
    expect(await saveTranslation('not-a-uuid', 'en', {}, f)).toEqual({
      error: 'resourceNotFound',
    })
    expect(await saveChapterTranslation('not-a-uuid', 'en', {}, f)).toEqual({
      error: 'resourceNotFound',
    })
    expect(await saveSettings('not-a-uuid', {}, new FormData())).toEqual({
      error: 'resourceNotFound',
    })
  })

  test('a valid uuid with no parent row resolves to resourceNotFound', async () => {
    // Well-formed but absent: passes the uuid guard, then the FK on the
    // translation insert must map to a handled error, not a 23503 500.
    const orphan = '00000000-0000-4000-8000-0000000000bb'
    const f = new FormData()
    f.set('title', 'x')
    expect(await saveTranslation(orphan, 'en', {}, f)).toEqual({
      error: 'resourceNotFound',
    })
    expect(await saveChapterTranslation(orphan, 'en', {}, f)).toEqual({
      error: 'resourceNotFound',
    })
  })

  test('a retired section can still be unpublished and re-slugged', async () => {
    // The counterpart to the admin list keeping orphans visible: showing a
    // row you cannot act on is not a workflow. There is no schema to
    // validate meta against and no meta fields on the form, so the stored
    // meta is preserved rather than re-parsed.
    const [row] = await db
      .insert(resources)
      .values({
        type: 'retired_section',
        slug: 'ghost',
        status: 'published',
        meta: { keepMe: true },
      })
      .returning({ id: resources.id })

    const f = new FormData()
    f.set('slug', 'ghost-archived')
    f.set('status', 'draft')
    f.set('tags', 'archived')
    expect(await saveSettings(row.id, {}, f)).toEqual({ ok: true })

    const [saved] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, row.id))
    expect(saved.status).toBe('draft')
    expect(saved.slug).toBe('ghost-archived')
    expect(saved.tags).toEqual(['archived'])
    expect(saved.meta).toEqual({ keepMe: true })
  })

  test('an unregistered type is rejected before it reaches the table', async () => {
    // resources.type is plain text now (ADR 0013) — the module registry is
    // the only thing standing between a bad type and the database, so this
    // is the guard the dropped pg enum used to provide.
    const f = new FormData()
    f.set('type', 'not-a-section')
    f.set('slug', 'whatever')
    expect(await createResource({}, f)).toMatchObject({ error: 'typeInvalid' })
    expect(await db.select().from(resources)).toHaveLength(0)
  })

  test('a duplicate (type, slug) is reported as slugTaken', async () => {
    await db
      .insert(resources)
      .values({ type: 'tool', slug: 'taken', status: 'draft' })

    const f = new FormData()
    f.set('type', 'tool')
    f.set('slug', 'taken')
    expect(await createResource({}, f)).toEqual({
      error: 'slugTaken',
      values: { type: 'tool', slug: 'taken' },
    })
  })
})

describe('every mutation is gated', () => {
  beforeEach(() => {
    denied = true
  })

  const uuid = '00000000-0000-4000-8000-0000000000aa'
  const form = () => new FormData()

  test('all admin actions reject when the caller is not an admin', async () => {
    // Thunks, not eager promises: an unawaited rejecting promise would surface
    // as an unhandled rejection before its turn in the loop.
    const calls: Array<[string, () => Promise<unknown>]> = [
      ['createResource', () => createResource({}, form())],
      ['saveTranslation', () => saveTranslation(uuid, 'en', {}, form())],
      ['saveSettings', () => saveSettings(uuid, {}, form())],
      ['deleteResource', () => deleteResource(uuid)],
      ['addChapter', () => addChapter(uuid)],
      [
        'saveChapterTranslation',
        () => saveChapterTranslation(uuid, 'en', {}, form()),
      ],
      ['moveChapter', () => moveChapter(uuid, 'up')],
      ['deleteChapter', () => deleteChapter(uuid)],
      ['createInvite', () => createInvite({}, form())],
      ['deleteInvite', () => deleteInvite(uuid)],
      ['setUserRole', () => setUserRole(uuid, form())],
      ['toggleUserBan', () => toggleUserBan(uuid)],
      ['sendUserResetEmail', () => sendUserResetEmail(uuid)],
    ]
    for (const [name, call] of calls) {
      await expect(call(), name).rejects.toThrow('DENIED')
    }
  })

  test('a rejected mutation writes nothing (insert and delete shapes)', async () => {
    const [seed] = await db
      .insert(resources)
      .values({ type: 'tool', slug: 'sentinel', status: 'draft' })
      .returning({ id: resources.id })

    const create = form()
    create.set('type', 'tool')
    create.set('slug', 'should-not-exist')
    await expect(createResource({}, create)).rejects.toThrow('DENIED')
    await expect(deleteResource(seed.id)).rejects.toThrow('DENIED')
    await expect(createInvite({}, form())).rejects.toThrow('DENIED')

    expect(await db.$count(resources)).toBe(1)
    expect(
      (await db.select().from(resources).where(eq(resources.id, seed.id)))
        .length,
    ).toBe(1)
    expect(await db.$count(invites)).toBe(0)
  })
})
