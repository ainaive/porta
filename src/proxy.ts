import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { isGatedPath, splitLocale } from '@/lib/gating'

const intl = createIntlMiddleware(routing)

// The gate here is only an optimistic cookie check for fast redirects —
// requireSession/requireAdmin re-verify against the database on every page.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isGatedPath(pathname) && !getSessionCookie(request)) {
    const { locale } = splitLocale(pathname)
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
