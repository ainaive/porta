// The emailed reset link is stamped from better-auth's baseURL, not from the
// redirectTo we pass. On a Vercel preview BETTER_AUTH_URL is unset, and the
// admin reset path (auth.api.*) doesn't re-derive the origin per request — so
// without canonicalBaseURL() the link would come out relative ("/reset-password
// /<token>?..."), which no inbox can open. This builds an auth instance in that
// exact env and captures the outgoing link to prove it stays absolute.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import { auth, canonicalBaseURL } from '@/lib/auth'
import { resetDb } from './harness'

const ORIGIN = 'http://localhost:3000'
const PROD_HOST = 'porta.example.com'

function headers() {
  return new Headers({ origin: ORIGIN })
}

const originalAuthUrl = process.env.BETTER_AUTH_URL
const originalProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL

beforeEach(async () => {
  await resetDb()
})

afterEach(() => {
  // Restore env so neither the auth singleton's neighbours nor other suites see
  // the preview simulation.
  if (originalAuthUrl === undefined) delete process.env.BETTER_AUTH_URL
  else process.env.BETTER_AUTH_URL = originalAuthUrl
  if (originalProdUrl === undefined)
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = originalProdUrl
})

describe('emailed reset link on a preview (BETTER_AUTH_URL unset)', () => {
  test('is absolute, using the Vercel production domain', async () => {
    // Register the user through the real auth (shared database).
    await auth.api.signUpEmail({
      body: {
        name: 'Preview User',
        email: 'preview@example.test',
        password: 'password-123',
      },
      headers: headers(),
    })

    // Simulate the preview environment, then build an instance that resolves its
    // baseURL from it exactly as production code does.
    delete process.env.BETTER_AUTH_URL
    process.env.VERCEL_PROJECT_PRODUCTION_URL = PROD_HOST
    expect(canonicalBaseURL()).toBe(`https://${PROD_HOST}`)

    let emailedUrl = ''
    const previewAuth = betterAuth({
      database: drizzleAdapter(db, { provider: 'pg' }),
      baseURL: canonicalBaseURL(),
      emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ url }) => {
          emailedUrl = url
        },
      },
    })

    await previewAuth.api.requestPasswordReset({
      body: { email: 'preview@example.test' },
      headers: headers(),
    })

    // Absolute (real host, not a relative "/reset-password/..."), and a link
    // better-auth's reset-password route can actually resolve.
    expect(emailedUrl).toStartWith(`https://${PROD_HOST}/`)
    expect(emailedUrl).toContain('/reset-password/')
  })
})
