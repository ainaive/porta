import { moduleFrameSrc } from '@/core/module/derive'

// The Content-Security-Policy, built per request because it carries a nonce.
// Kept pure and separate from src/proxy.ts so the policy itself is testable
// without a NextRequest.
//
// Why a nonce rather than a static policy in next.config.ts: `script-src
// 'unsafe-inline'` permits exactly the injected script a CSP exists to stop,
// so it buys a header and no defence. A nonce policy requires every page to
// render dynamically — a price this app has already paid, since every route
// under src/app is force-dynamic. See ADR 0014; that trade-off is the reason
// adopting Cache Components later would have to revisit this.

export type CspOptions = {
  nonce: string
  isDev: boolean
  /** Whether *this request* arrived over https — not whether the build is a
   *  production one. See `upgrade-insecure-requests` below. */
  isHttps: boolean
}

export function buildCsp({ nonce, isDev, isHttps }: CspOptions): string {
  const directives: Array<[string, string]> = [
    ['default-src', "'self'"],
    // 'strict-dynamic' lets Next's nonced bootstrap load the chunks it needs
    // without naming each one; 'self' is the fallback for browsers that
    // ignore strict-dynamic. React uses eval in development only, to rebuild
    // server stacks in the browser.
    [
      'script-src',
      `'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    ],
    // A nonce cannot cover style *attributes*, which is what React's inline
    // `style={{…}}` compiles to — the landing's decorative ramps use them
    // throughout. Inline styles are a far smaller surface than inline
    // scripts, so this is where the policy stops being strict, deliberately.
    ['style-src', "'self' 'unsafe-inline'"],
    ['img-src', "'self' blob: data:"],
    ['font-src', "'self'"],
    ['connect-src', "'self'"],
    // Derived from the module manifests, never hand-listed here.
    ['frame-src', ["'self'", ...moduleFrameSrc].join(' ')],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['frame-ancestors', "'none'"],
  ]

  const policy = directives
    .map(([name, value]) => `${name} ${value}`)
    .join('; ')

  // Gated on the transport, not on the build mode — the same signal HSTS uses
  // in security-headers.ts, and for a closely related reason.
  //
  // The directive tells the browser to rewrite every http:// subresource to
  // https:// before fetching. On a production build served over plain http
  // that is fatal: the page's own /_next/static/* requests get upgraded, the
  // server has no TLS listener, and every one fails ERR_SSL_PROTOCOL_ERROR —
  // an unstyled, unhydrated page. The self-hosted container reached at
  // http://a-lan-address:3000 is exactly that deployment.
  //
  // It looks safe on localhost only because http://localhost is a potentially
  // trustworthy origin and so is exempt from the upgrade, which is why an e2e
  // suite pointed at localhost cannot see the problem.
  return isHttps ? `${policy}; upgrade-insecure-requests` : policy
}

/** Report-only ships the policy without enforcing it: violations reach the
 *  console and nothing breaks. Roll out with CSP_REPORT_ONLY=1, confirm a
 *  clean console on a preview, then unset it to enforce. */
export function cspHeaderName(reportOnly: boolean): string {
  return reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'
}

export function newNonce(): string {
  return btoa(crypto.randomUUID())
}
