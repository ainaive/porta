import { and, eq, isNull } from 'drizzle-orm'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins'
import { db } from '@/db'
import { invites } from '@/db/schema'
import { findValidInvite, hasAnyUser } from '@/lib/invites'

// Sign-up is invite-only. The gate lives here — in the API hooks — rather than
// in the sign-up page, so posting directly to /api/auth/sign-up/email cannot
// bypass it. The one exception: when no user exists yet, the first sign-up is
// allowed without an invite and becomes the admin (bootstrap).
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
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
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return
      const newUser = ctx.context.newSession?.user
      if (!newUser) return

      const token = ctx.body?.inviteToken
      if (typeof token === 'string' && token.length > 0) {
        await db
          .update(invites)
          .set({ usedAt: new Date(), usedBy: newUser.id })
          .where(and(eq(invites.token, token), isNull(invites.usedAt)))
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData, ctx) => {
          // First account ever → admin (bootstrap). Otherwise the role comes
          // from the invite, which the request hook has already validated.
          if (!(await hasAnyUser())) {
            return { data: { ...userData, role: 'admin' } }
          }
          const token = ctx?.body?.inviteToken
          if (typeof token === 'string' && token.length > 0) {
            const invite = await findValidInvite(token)
            if (invite) return { data: { ...userData, role: invite.role } }
          }
          return { data: userData }
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
