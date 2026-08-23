import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { after } from 'next/server'
import { db } from '@/db'
import { invites, user } from '@/db/schema'
import { type Email, sendEmail } from '@/lib/email'
import { claimInvite, findValidInvite, hasAnyUser } from '@/lib/invites'
import { canonicalBaseURL } from '@/lib/metadata'

// With baseURL pinned to the canonical origin (src/lib/metadata.ts), a Vercel
// preview serves auth from its own ephemeral host — so its POSTs would fail
// better-auth's origin check unless we trust that host too. Empty off Vercel
// (Docker), where baseURL already matches the request origin.
function previewOrigins(): string[] {
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`)
}

// Rate limiting keys on the client IP, and the only way to learn it behind a
// proxy is x-forwarded-for — which better-auth trusts by default. That is
// right when something in front overwrites the header and wrong when nothing
// does: on a directly-exposed server the *client* sets it, so an attacker
// mints a fresh bucket per request and the limit stops applying to the only
// person it was for.
//
// So the explicit configuration is for the untrusted case. `[]` (not
// undefined — undefined means "use the default", which is the header) makes
// better-auth find no address and fall back to one bucket per path. That
// costs legitimate users nothing they were not already paying: a browser
// talking to the server directly sends no x-forwarded-for either, so it was
// always going to share. It only takes the escape hatch away from whoever
// forges the header.
//
// Vercel always overwrites x-forwarded-for; a self-hosted deployment behind
// a reverse proxy opts in with TRUST_PROXY_HEADERS=1. See ADR 0014.
export function trustedIpHeaders(): string[] | undefined {
  const behindProxy =
    process.env.VERCEL === '1' || process.env.TRUST_PROXY_HEADERS === '1'
  return behindProxy ? undefined : []
}

// better-auth rate-limits by default in production, but in memory: the counter
// dies with the instance, so it holds across neither Vercel's reused-and-
// recycled instances nor a scaled-out container. Postgres is already the one
// thing both deployment targets share, and the database storage does its
// check-and-increment as a single conditional update, so concurrent requests
// cannot all pass a stale read.
//
// Exported so the tests can drive these exact numbers through the real
// limiter: it is disabled outside production, which is right for the app and
// would leave the rules untested.
export const rateLimitConfig = {
  storage: 'database',
  window: 60,
  max: 100,
  // Tighter than the built-in defaults (3 per 10s on /sign-in and /sign-up),
  // which reset six times a minute — on the order of a thousand password
  // guesses an hour from one address. This is an invite-only portal for a
  // known population; nobody legitimate types a password five times a minute.
  customRules: {
    '/sign-in/email': { window: 60, max: 5 },
    '/sign-up/email': { window: 60, max: 5 },
    // These two send mail to an address the requester chose. The limit is as
    // much about not being someone else's spam cannon as about the account.
    '/request-password-reset': { window: 60, max: 3 },
    '/reset-password': { window: 60, max: 5 },
  },
} as const

// Send without blocking the response. `after()` defers the send past the
// response (the point — see sendResetPassword), but it throws outside a Next
// request scope (e.g. the DB tests call auth.api directly). There, fall back to
// fire-and-forget: still non-blocking, so the timing behaviour is identical.
function scheduleEmail(email: Email): void {
  try {
    after(() => sendEmail(email))
  } catch {
    void sendEmail(email)
  }
}

// Sign-up is invite-only. The gate lives here — in the API hooks — rather than
// in the sign-up page, so posting directly to /api/auth/sign-up/email cannot
// bypass it. The one exception: when no user exists yet, the first sign-up is
// allowed without an invite and becomes the admin (bootstrap).
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  baseURL: canonicalBaseURL(),
  // Preview deployments serve from an ephemeral host that isn't the (canonical)
  // baseURL — trust it so sign-in/reset POSTs pass the origin check there.
  trustedOrigins: previewOrigins(),
  advanced: { ipAddress: { ipAddressHeaders: trustedIpHeaders() } },
  // `enabled` is left at its default — production only — so dev and the test
  // suites are not throttled. See rateLimitConfig above.
  rateLimit: rateLimitConfig,
  emailAndPassword: {
    enabled: true,
    // A reset means the account may be compromised — drop every existing
    // session so a stolen one can't outlive the reset.
    revokeSessionsOnPasswordReset: true,
    // A user who forgets their password can recover without an admin. The
    // reset URL bounces through /api/auth/reset-password/:token, which
    // redirects to the reset page with the token. Bilingual, since the email
    // doesn't know the recipient's chosen locale.
    sendResetPassword: async ({ user: recipient, url }) => {
      // Schedule after the response: awaiting the (up to 10s) send here would
      // make a registered account respond slower than an unknown one — a
      // timing oracle for account existence.
      scheduleEmail({
        to: recipient.email,
        subject: 'Reset your password · 重置密码',
        text: `Reset your password: ${url}\n\n重置你的密码：${url}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>Reset your password / 重置你的密码:</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      })
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return
      if (!(await hasAnyUser())) return

      const token = ctx.body?.inviteToken
      if (typeof token !== 'string' || token.length === 0) {
        throw new APIError('FORBIDDEN', {
          message: 'Sign-up requires an invitation.',
        })
      }
      const invite = await findValidInvite(token)
      if (!invite) {
        throw new APIError('FORBIDDEN', {
          message: 'This invitation is invalid or has expired.',
        })
      }
      const email = String(ctx.body?.email ?? '').toLowerCase()
      if (invite.email && invite.email.toLowerCase() !== email) {
        throw new APIError('FORBIDDEN', {
          message: 'This invitation is for a different email address.',
        })
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData, ctx) => {
          // The invite is claimed here — a conditional UPDATE, so of N
          // concurrent signups holding one token exactly one proceeds. The
          // request hook has already produced the friendly errors for the
          // common failures; this is the authoritative single-use gate.
          // Only tokenless signups may take the bootstrap branch: a token
          // must always claim, otherwise a junk token would ride an empty
          // table to admin and dodge the after-hook rollback (which only
          // covers tokenless signups).
          const token = ctx?.body?.inviteToken
          if (typeof token !== 'string' || token.length === 0) {
            // First account ever → admin (bootstrap).
            if (!(await hasAnyUser())) {
              return { data: { ...userData, role: 'admin' } }
            }
            return { data: userData }
          }
          const invite = await claimInvite(token)
          if (!invite) {
            throw new APIError('FORBIDDEN', {
              message: 'This invitation is invalid or has expired.',
            })
          }
          return { data: { ...userData, role: invite.role } }
        },
        after: async (createdUser, ctx) => {
          const token = ctx?.body?.inviteToken
          if (typeof token === 'string' && token.length > 0) {
            await db
              .update(invites)
              .set({ usedBy: createdUser.id })
              .where(
                and(
                  eq(invites.token, token),
                  isNotNull(invites.usedAt),
                  isNull(invites.usedBy),
                ),
              )
            return
          }
          // Tokenless creation on the sign-up path is the bootstrap. Two
          // racing bootstraps can both pass the empty-table checks; any
          // signup that finds another user here rolls itself back — failing
          // closed beats minting two admins.
          if (ctx?.path === '/sign-up/email' && (await db.$count(user)) > 1) {
            await db.delete(user).where(eq(user.id, createdUser.id))
            throw new APIError('FORBIDDEN', {
              message: 'Sign-up requires an invitation.',
            })
          }
        },
      },
    },
  },
  plugins: [
    admin({ defaultRole: 'member', adminRoles: ['admin'] }),
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
