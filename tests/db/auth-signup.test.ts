// Locks down the invite-only signup contract by calling the better-auth
// server API directly (no HTTP server needed — the request hooks run
// transport-agnostically, and nextCookies() tolerates missing request scope).
import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { invites, user } from '@/db/schema'
import { auth } from '@/lib/auth'
import { resetDb } from './harness'

const DAY = 24 * 60 * 60 * 1000

type SignUpBody = NonNullable<
  Parameters<typeof auth.api.signUpEmail>[0]
>['body'] & {
  inviteToken?: string
}

async function signUp(
  email: string,
  inviteToken?: string,
): Promise<{ user: { id: string } }> {
  const body: SignUpBody = {
    name: 'Test Person',
    email,
    password: 'password-123',
    inviteToken,
  }
  return auth.api.signUpEmail({ body, headers: new Headers() })
}

async function roleOf(email: string): Promise<string | null> {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.email, email))
  return row?.role ?? null
}

async function insertInvite(
  token: string,
  invitedBy: string,
  overrides: Partial<typeof invites.$inferInsert> = {},
): Promise<void> {
  await db.insert(invites).values({
    token,
    invitedBy,
    expiresAt: new Date(Date.now() + 7 * DAY),
    ...overrides,
  })
}

beforeEach(async () => {
  await resetDb()
})

describe('bootstrap', () => {
  test('first signup succeeds without an invite and becomes admin', async () => {
    await signUp('founder@example.test')
    expect(await roleOf('founder@example.test')).toBe('admin')
  })

  test('second tokenless signup is rejected', async () => {
    await signUp('founder@example.test')
    await expect(signUp('intruder@example.test')).rejects.toThrow(/invitation/i)
  })

  test('a token-bearing signup never bootstraps, even on an empty table', async () => {
    // A junk token must not ride the empty-table branch to admin: with a
    // token present the invite claim is mandatory, and a fresh database
    // has no invites to claim.
    const results = await Promise.allSettled([
      signUp('junk-one@example.test', 'junk-token-1'),
      signUp('junk-two@example.test', 'junk-token-2'),
    ])
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(await db.$count(user)).toBe(0)
  })

  test('concurrent bootstrap signups never yield two admins', async () => {
    const results = await Promise.allSettled([
      signUp('first@example.test'),
      signUp('second@example.test'),
    ])
    const admins = await db.select().from(user).where(eq(user.role, 'admin'))
    // Depending on interleaving zero signups may survive (both roll back,
    // failing closed) — but never more than one, and no non-admin leftovers.
    expect(admins.length).toBeLessThanOrEqual(1)
    expect(await db.$count(user)).toBe(admins.length)
    expect(
      results.filter((r) => r.status === 'fulfilled').length,
    ).toBeLessThanOrEqual(1)
  })
})

describe('invite redemption', () => {
  let adminId: string

  beforeEach(async () => {
    const result = await signUp('founder@example.test')
    adminId = result.user.id
  })

  test('invalid and expired tokens are rejected', async () => {
    await expect(signUp('a@example.test', 'no-such-token')).rejects.toThrow(
      /invalid or has expired/i,
    )

    await insertInvite('expired', adminId, {
      expiresAt: new Date(Date.now() - DAY),
    })
    await expect(signUp('b@example.test', 'expired')).rejects.toThrow(
      /invalid or has expired/i,
    )
  })

  test('email-locked invites only work for that email', async () => {
    await insertInvite('locked', adminId, { email: 'right@example.test' })

    await expect(signUp('wrong@example.test', 'locked')).rejects.toThrow(
      /different email/i,
    )
    await signUp('right@example.test', 'locked')
    expect(await roleOf('right@example.test')).toBe('member')
  })

  test('applies the invited role and consumes the invite', async () => {
    await insertInvite('admin-invite', adminId, { role: 'admin' })

    const created = await signUp('second-admin@example.test', 'admin-invite')
    expect(await roleOf('second-admin@example.test')).toBe('admin')

    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, 'admin-invite'))
    expect(invite.usedAt).not.toBeNull()
    expect(invite.usedBy).toBe(created.user.id)

    // A consumed invite cannot be reused.
    await expect(
      signUp('copycat@example.test', 'admin-invite'),
    ).rejects.toThrow(/invalid or has expired/i)
  })

  test('concurrent signups with one invite create exactly one account', async () => {
    await insertInvite('race', adminId)

    const results = await Promise.allSettled([
      signUp('racer-one@example.test', 'race'),
      signUp('racer-two@example.test', 'race'),
    ])

    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1)
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, 'race'))
    expect(invite.usedAt).not.toBeNull()
    // Founder + the single winner.
    expect(await db.$count(user)).toBe(2)
  })
})
