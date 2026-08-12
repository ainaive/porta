import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { invites, user } from '@/db/schema'
import { sendEmail } from '@/lib/email'
import { claimInvite, findValidInvite, hasAnyUser } from '@/lib/invites'

// Sign-up is invite-only. The gate lives here — in the API hooks — rather than
// in the sign-up page, so posting directly to /api/auth/sign-up/email cannot
// bypass it. The one exception: when no user exists yet, the first sign-up is
// allowed without an invite and becomes the admin (bootstrap).
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    // A user who forgets their password can recover without an admin. The
    // reset URL bounces through /api/auth/reset-password/:token, which
    // redirects to the reset page with the token. Bilingual, since the email
    // doesn't know the recipient's chosen locale.
    sendResetPassword: async ({ user: recipient, url }) => {
      await sendEmail({
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
