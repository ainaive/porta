import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth, type Session } from '@/lib/auth'

// The proxy only checks cookie existence (no DB); these are the authoritative
// checks and must be called at the top of every gated/admin page and action.
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() })
})

export async function requireSession(nextPath?: string): Promise<Session> {
  const session = await getSession()
  if (!session) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/sign-in${suffix}`)
  }
  return session
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/sign-in')
  // Admin pages 404 for non-admins rather than revealing they exist.
  if (session.user.role !== 'admin') notFound()
  return session
}
