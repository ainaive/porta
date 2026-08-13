// Exercises the better-auth password-reset contract against the database:
// request → a single-use verification token → reset → the new password works
// and the token is gone. sendResetPassword runs (logging the link, since no
// RESEND_API_KEY in tests) but the token lives in the verification table, so
// the test reads it there rather than from an inbox.
import { beforeEach, describe, expect, test } from 'bun:test'
import { like } from 'drizzle-orm'
import { db } from '@/db'
import { session, verification } from '@/db/schema'
import { auth } from '@/lib/auth'
import { resetDb } from './harness'

const ORIGIN = 'http://localhost:3000'

function headers() {
  return new Headers({ origin: ORIGIN })
}

async function signUp(email: string, password: string) {
  return auth.api.signUpEmail({
    body: { name: 'Test Person', email, password },
    headers: headers(),
  })
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

  test('a reset revokes existing sessions', async () => {
    // signUp auto-signs-in, leaving a live session row.
    await signUp('founder@example.test', 'password-123')
    expect(await db.$count(session)).toBeGreaterThan(0)

    await requestReset('founder@example.test')
    await auth.api.resetPassword({
      body: { newPassword: 'new-password-456', token: await resetToken() },
      headers: headers(),
    })

    // revokeSessionsOnPasswordReset: the pre-reset session is gone, so a
    // stolen/leaked cookie can't outlive the reset that was meant to lock it out.
    expect(await db.$count(session)).toBe(0)
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
