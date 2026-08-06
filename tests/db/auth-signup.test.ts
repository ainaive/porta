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
    expect(signUp('intruder@example.test')).rejects.toThrow(/invitation/i)
  })
})

describe('invite redemption', () => {
  let adminId: string

  beforeEach(async () => {
    const result = await signUp('founder@example.test')
    adminId = result.user.id
  })

  test('invalid and expired tokens are rejected', async () => {
    expect(signUp('a@example.test', 'no-such-token')).rejects.toThrow(
      /invalid or has expired/i,
    )

    await insertInvite('expired', adminId, {
      expiresAt: new Date(Date.now() - DAY),
    })
    expect(signUp('b@example.test', 'expired')).rejects.toThrow(
      /invalid or has expired/i,
    )
  })

  test('email-locked invites only work for that email', async () => {
    await insertInvite('locked', adminId, { email: 'right@example.test' })

    expect(signUp('wrong@example.test', 'locked')).rejects.toThrow(
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
    expect(signUp('copycat@example.test', 'admin-invite')).rejects.toThrow(
      /invalid or has expired/i,
    )
  })
})
