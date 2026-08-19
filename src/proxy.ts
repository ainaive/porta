import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { moduleRedirects } from '@/core/module/derive'
import { routing } from '@/i18n/routing'
import { isGatedPath, splitLocale } from '@/lib/gating'

const intl = createIntlMiddleware(routing)

// Modules declare the paths they used to own; a move stays inside the module
// that made it. Handled here rather than in next.config.ts's `redirects()`
// because that file is compiled without tsconfig path aliases, so it cannot
// import the registry — and one source of truth is worth more than a CDN-level
// redirect, especially with a self-hosted target to serve too (ADR 0005).
function movedTo(bare: string): string | null {
  for (const { from, to } of moduleRedirects) {
    if (bare === from) return to
    if (bare.startsWith(`${from}/`)) return to + bare.slice(from.length)
  }
  return null
}

// The gate here is only an optimistic cookie check for fast redirects —
// requireSession/requireAdmin re-verify against the database on every page.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Before the gate: a signed-out visitor following an old link should land
  // on the new URL's sign-in, not the old one's.
  const { locale: currentLocale, bare } = splitLocale(pathname)
  const moved = movedTo(bare)
  if (moved) {
    const url = new URL(`/${currentLocale}${moved}`, request.url)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url, 308)
  }

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
