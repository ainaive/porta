// The emailed reset link is stamped from better-auth's baseURL, not from the
// redirectTo we pass. On a Vercel preview BETTER_AUTH_URL is unset, and the
// admin reset path (auth.api.*) doesn't re-derive the origin per request — so
// without canonicalBaseURL() the link would come out relative ("/reset-password
// /<token>?..."), unopenable in an inbox. We pin baseURL to the production
// domain instead. That means the callback must NOT be an absolute preview origin
// (it would reach production, which doesn't trust it, and 403), so the forms
// send a relative reset path that's same-origin against any baseURL.
//
// better-auth disables origin checks in a test env by default, which would make
// these pass vacuously — so the instance sets advanced.disableOriginCheck:false
// to exercise the real callback validation.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import { auth, canonicalBaseURL } from '@/lib/auth'
import { resetDb } from './harness'

const ORIGIN = 'http://localhost:3000'
const PROD_HOST = 'porta.example.com'
const EMAIL = 'preview@example.test'

function headers() {
  return new Headers({ origin: ORIGIN })
}

const originalAuthUrl = process.env.BETTER_AUTH_URL
const originalProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL

// A production-configured instance (as a preview would resolve it) whose
// sendResetPassword captures the emailed link, plus a registered recipient.
async function setupPreview() {
  await auth.api.signUpEmail({
    body: { name: 'Preview User', email: EMAIL, password: 'password-123' },
    headers: headers(),
  })
  delete process.env.BETTER_AUTH_URL
  process.env.VERCEL_PROJECT_PRODUCTION_URL = PROD_HOST
  expect(canonicalBaseURL()).toBe(`https://${PROD_HOST}`)

  const captured: { url: string } = { url: '' }
  const previewAuth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    baseURL: canonicalBaseURL(),
    advanced: { disableOriginCheck: false },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ url }) => {
        captured.url = url
      },
    },
  })
  return { previewAuth, captured }
}

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
    const { previewAuth, captured } = await setupPreview()

    await previewAuth.api.requestPasswordReset({
      body: { email: EMAIL, redirectTo: '/en/reset-password' },
      headers: headers(),
    })

    // Absolute (real host, not a relative "/reset-password/..."), and a link
    // better-auth's reset-password route can actually resolve.
    expect(captured.url).toStartWith(`https://${PROD_HOST}/`)
    expect(captured.url).toContain('/reset-password/')
  })

  test('a relative callback follows through the handler to the reset page', async () => {
    const { previewAuth, captured } = await setupPreview()

    // What the forms now send: a relative reset path, so the callback stays
    // same-origin as the emailed action URL on any deployment.
    await previewAuth.api.requestPasswordReset({
      body: { email: EMAIL, redirectTo: '/en/reset-password' },
      headers: headers(),
    })

    // Clicking the emailed link (through the production-configured handler)
    // passes the callback origin check and redirects to the reset page.
    const res = await previewAuth.handler(new Request(captured.url))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get('location') ?? ''
    expect(location).toStartWith(`https://${PROD_HOST}/en/reset-password`)
    expect(location).toContain('token=')
  })

  test('an absolute cross-deployment callback is rejected on click (why forms send a relative path)', async () => {
    const { previewAuth, captured } = await setupPreview()

    // The old form behaviour: an absolute preview origin as the callback.
    await previewAuth.api.requestPasswordReset({
      body: {
        email: EMAIL,
        redirectTo: 'https://porta-git-preview.vercel.app/en/reset-password',
      },
      headers: headers(),
    })

    // Clicking the emailed link lands on the production-configured handler,
    // which doesn't trust the preview origin → 403, never reaching the reset
    // page. This is the exact failure the relative path avoids.
    const res = await previewAuth.handler(new Request(captured.url))
    expect(res.status).toBe(403)
  })
})
