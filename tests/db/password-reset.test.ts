// Exercises the better-auth password-reset contract against the database:
// request → a single-use verification token → reset → the new password works
// and the token is gone. sendResetPassword runs (with no RESEND_API_KEY in
// tests it logs only a redacted status, never the link) but the token lives in
// the verification table, so the test reads it there rather than from an inbox.
import { beforeEach, describe, expect, test } from 'bun:test'
import { eq, like } from 'drizzle-orm'
import { db } from '@/db'
import { invites, session, verification } from '@/db/schema'
import { auth } from '@/lib/auth'
import { resetDb } from './harness'

const ORIGIN = 'http://localhost:3000'
const DAY = 24 * 60 * 60 * 1000

function headers() {
  return new Headers({ origin: ORIGIN })
}

// Signup is invite-only past the first (bootstrap) account, so extra users need
// a token. body carries inviteToken, which the public type doesn't surface.
type SignUpBody = NonNullable<
  Parameters<typeof auth.api.signUpEmail>[0]
>['body'] & {
  inviteToken?: string
}

async function signUp(email: string, password: string, inviteToken?: string) {
  const body: SignUpBody = { name: 'Test Person', email, password, inviteToken }
  return auth.api.signUpEmail({ body, headers: headers() })
}

async function insertInvite(token: string, invitedBy: string): Promise<void> {
  await db
    .insert(invites)
    .values({ token, invitedBy, expiresAt: new Date(Date.now() + 7 * DAY) })
}

async function requestReset(email: string) {
  return auth.api.requestPasswordReset({
    body: { email, redirectTo: `${ORIGIN}/en/reset-password` },
    headers: headers(),
  })
}

async function resetToken(): Promise<string> {
  const [row] = await db
    .select()
    .from(verification)
    .where(like(verification.identifier, 'reset-password:%'))
  return row.identifier.slice('reset-password:'.length)
}

beforeEach(async () => {
  await resetDb()
})

describe('password reset', () => {
  test('a reset token is single-use and changes the password', async () => {
    await signUp('founder@example.test', 'password-123')

    await requestReset('founder@example.test')
    const token = await resetToken()
    expect(token.length).toBeGreaterThan(0)

    await auth.api.resetPassword({
      body: { newPassword: 'new-password-456', token },
      headers: headers(),
    })

    // The old password is rejected, the new one works.
    await expect(
      auth.api.signInEmail({
        body: { email: 'founder@example.test', password: 'password-123' },
        headers: headers(),
      }),
    ).rejects.toThrow()
    const signedIn = await auth.api.signInEmail({
      body: { email: 'founder@example.test', password: 'new-password-456' },
      headers: headers(),
    })
    expect(signedIn.user.email).toBe('founder@example.test')

    // The token is consumed.
    const remaining = await db
      .select()
      .from(verification)
      .where(like(verification.identifier, 'reset-password:%'))
    expect(remaining).toHaveLength(0)
  })

  test('a reset revokes the resetting user’s sessions but not others’', async () => {
    // signUp auto-signs-in, so each leaves a live session row. The bystander
    // proves the revocation is scoped — a plain "sessions == 0" check would also
    // pass if a reset wrongly nuked everyone's sessions.
    const founder = await signUp('founder@example.test', 'password-123')
    // Past the bootstrap account, signup needs an invite.
    const token = 'invite-for-bystander'
    await insertInvite(token, founder.user.id)
    const bystander = await signUp(
      'bystander@example.test',
      'password-123',
      token,
    )
    expect(await db.$count(session, eq(session.userId, founder.user.id))).toBe(
      1,
    )
    expect(
      await db.$count(session, eq(session.userId, bystander.user.id)),
    ).toBe(1)

    await requestReset('founder@example.test')
    await auth.api.resetPassword({
      body: { newPassword: 'new-password-456', token: await resetToken() },
      headers: headers(),
    })

    // revokeSessionsOnPasswordReset: the founder's pre-reset session is gone
    // (a stolen cookie can't outlive the reset meant to lock it out), while the
    // bystander's session is untouched.
    expect(await db.$count(session, eq(session.userId, founder.user.id))).toBe(
      0,
    )
    expect(
      await db.$count(session, eq(session.userId, bystander.user.id)),
    ).toBe(1)
  })

  test('requesting a reset for an unknown email does not error or leak', async () => {
    const result = await requestReset('nobody@example.test')
    expect(result.status).toBe(true)
    // No token is created for a non-existent user.
    const rows = await db
      .select()
      .from(verification)
      .where(like(verification.identifier, 'reset-password:%'))
    expect(rows).toHaveLength(0)
  })
})
