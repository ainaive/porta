import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db'
import { invites, user } from '@/db/schema'
import { findValidInvite, hasAnyUser } from '@/lib/invites'
import { resetDb } from './harness'

const DAY = 24 * 60 * 60 * 1000

async function insertUser(id = 'u1'): Promise<string> {
  await db
    .insert(user)
    .values({ id, name: 'Test User', email: `${id}@example.test` })
  return id
}

async function insertInvite(
  token: string,
  overrides: Partial<typeof invites.$inferInsert> = {},
): Promise<void> {
  await db.insert(invites).values({
    token,
    invitedBy: 'u1',
    expiresAt: new Date(Date.now() + 7 * DAY),
    ...overrides,
  })
}

beforeEach(async () => {
  await resetDb()
})

describe('hasAnyUser', () => {
  test('flips from false to true on first user', async () => {
    expect(await hasAnyUser()).toBe(false)
    await insertUser()
    expect(await hasAnyUser()).toBe(true)
  })
})

describe('findValidInvite', () => {
  beforeEach(async () => {
    await insertUser()
  })

  test('returns a valid unused invite', async () => {
    await insertInvite('valid-token')
    const invite = await findValidInvite('valid-token')
    expect(invite?.token).toBe('valid-token')
    expect(invite?.role).toBe('member')
  })

  test('rejects an expired invite', async () => {
    await insertInvite('expired-token', {
      expiresAt: new Date(Date.now() - DAY),
    })
    expect(await findValidInvite('expired-token')).toBeNull()
  })

  test('rejects a consumed invite', async () => {
    await insertInvite('used-token', { usedAt: new Date(), usedBy: 'u1' })
    expect(await findValidInvite('used-token')).toBeNull()
  })

  test('rejects an unknown token', async () => {
    expect(await findValidInvite('never-issued')).toBeNull()
  })
})
