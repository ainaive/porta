// Baseline response headers, applied to every path by next.config.ts. They
// live here rather than inline in the config so they can be unit-tested; the
// config imports this file by *relative* path because next.config.ts is
// compiled without tsconfig aliases (the same constraint that keeps module
// redirects in src/proxy.ts instead of the config's redirects()).
//
// The Content-Security-Policy is deliberately NOT here: it carries a
// per-request nonce and so is built in src/proxy.ts (src/lib/csp.ts). This
// list is what the proxy cannot cover — its matcher excludes /api, and these
// headers matter on better-auth's JSON responses too.

type HeaderPair = { key: string; value: string }

export const BASELINE_SECURITY_HEADERS: readonly HeaderPair[] = [
  // Never let a browser second-guess a Content-Type. Cheap, and the whole
  // defence against a JSON response being executed as script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send the full URL same-origin, bare origin cross-origin, nothing over a
  // downgrade. Gated paths carry slugs and `next=` params worth not leaking.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // frame-ancestors in the CSP is the modern form; this is the fallback for
  // anything that doesn't read it. Both say the same thing.
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // Severs the opener relationship so a popup can't reach back into a
  // signed-in window.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

// Pinning HSTS is irreversible for its max-age, so it must never be sent on a
// plain-HTTP origin: a bare `docker compose up` or a local `next start` serves
// http://localhost, and a browser that pinned it there would refuse the site
// until the header expired. Behind Vercel or any reverse proxy the request
// carries x-forwarded-proto, which is the only signal available to a static
// header rule.
export const HSTS_HEADER: HeaderPair = {
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload',
}

export const HTTPS_ONLY_CONDITION = [
  { type: 'header' as const, key: 'x-forwarded-proto', value: 'https' },
]

export function securityHeaders() {
  return [
    { source: '/(.*)', headers: [...BASELINE_SECURITY_HEADERS] },
    {
      source: '/(.*)',
      has: [...HTTPS_ONLY_CONDITION],
      headers: [HSTS_HEADER],
    },
  ]
}
