import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { cache } from 'react'
import { redirect } from '@/i18n/navigation'
import { auth, type Session } from '@/lib/auth'

// The proxy only checks cookie existence (no DB); these are the authoritative
// checks and must be called at the top of every gated/admin page and action.
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() })
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
