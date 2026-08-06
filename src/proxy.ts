import { getSessionCookie } from 'better-auth/cookies'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const intl = createIntlMiddleware(routing)

// Resource detail pages and the whole admin area require sign-in; listings
// stay public. This is only an optimistic cookie check for fast redirects —
// requireSession/requireAdmin re-verify against the database on every page.
const GATED = [/^\/(tools|courses|videos|models)\/.+/, /^\/admin(\/|$)/]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const hasLocalePrefix = (routing.locales as readonly string[]).includes(
    segments[1],
  )
  const locale = hasLocalePrefix ? segments[1] : routing.defaultLocale
  const bare = hasLocalePrefix ? `/${segments.slice(2).join('/')}` : pathname

  if (GATED.some((r) => r.test(bare)) && !getSessionCookie(request)) {
    const url = new URL(`/${locale}/sign-in`, request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return intl(request)
}

export const config = {
  // /api is excluded so the intl middleware never rewrites better-auth routes.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
