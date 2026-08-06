import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { cache } from 'react'
import { redirect } from '@/i18n/navigation'
import { auth, type Session } from '@/lib/auth'

// The proxy only checks cookie existence (no DB); these are the authoritative
// checks and must be called at the top of every gated/admin page and action.
export const getSession = cache(async (): Promise<Session | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  // better-auth's admin plugin only rejects banned users at sign-in; a live
  // session must not outlast a ban, so a banned session reads as absent.
  if (session?.user.banned) return null
  return session
})

export async function requireSession(nextPath?: string): Promise<Session> {
  const session = await getSession()
  if (!session) {
    redirect({
      href: nextPath
        ? { pathname: '/sign-in', query: { next: nextPath } }
        : '/sign-in',
      locale: await getLocale(),
    })
    throw new Error('unreachable: redirect throws')
  }
  return session
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    redirect({ href: '/sign-in', locale: await getLocale() })
    throw new Error('unreachable: redirect throws')
  }
  // Admin pages 404 for non-admins rather than revealing they exist.
  if (session.user.role !== 'admin') notFound()
  return session
}
