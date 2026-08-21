# 0014 — Security headers, a nonce CSP, and rate limiting keyed on a trusted address

- **Status**: accepted
- **Date**: 2026-08-21

## Context

The application shipped with no response security headers of any kind: no
Content-Security-Policy, no `nosniff`, no `Referrer-Policy`, no framing
protection. It is a public-facing site that carries session cookies, renders
admin-supplied markdown and iframes, and hides an admin area behind a
deliberate 404 ([CONTEXT.md](../../CONTEXT.md), gating tiers).

Rate limiting was likewise unconfigured. better-auth enables it in production
by default, but with `storage: 'memory'`: the counter dies with the instance,
which holds across neither Vercel's reused-and-recycled instances nor a
scaled-out container — precisely the two deployment targets of
[ADR 0005](./0005-dual-deployment-targets.md). Its defaults also allow 3
attempts per 10 seconds on sign-in, which resets six times a minute.

And there was nothing telling crawlers which paths are gated.

## Decision

**Baseline headers in `next.config.ts`, CSP in the proxy.** The static set
(`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`) lives in
`src/lib/security-headers.ts` and is applied by the config, because the
config is the only layer that reaches `/api` — the proxy matcher excludes it
so next-intl can never rewrite better-auth's routes. `Strict-Transport-Security`
is a separate rule conditioned on `x-forwarded-proto: https`; pinning it is
irreversible for its max-age, and both a local `next start` and a bare
`docker compose up` serve plain HTTP.

**The CSP carries a per-request nonce** and is therefore built in
`src/proxy.ts` (`src/lib/csp.ts`). The rejected alternative was a static
policy in `next.config.ts`, which requires `script-src 'unsafe-inline'` —
permitting exactly the injected script a CSP exists to stop. `style-src`
keeps `'unsafe-inline'`: React's inline `style={{…}}` compiles to style
*attributes*, which a nonce cannot cover, and the landing's decorative ramps
use them throughout ([ADR 0008](./0008-landing-visual-system.md)). Inline
styles are a far smaller surface than inline scripts.

`frame-src` is **derived from the module registry**, not listed in the policy.
A module declares the origins it embeds via `frameSrc` on its manifest; Help &
Tutorials declares its video providers from the same constant `videoMeta`
validates `embedUrl` against, so a URL the schema accepts is always one the
browser will frame.

**Rate limiting moves to Postgres**, the one thing both targets already share,
with rules over a 60-second window on the four endpoints that take a
credential or send mail. `enabled` stays at its default — production only — so
the config is exported and the tests drive these exact numbers through a
second better-auth instance with it forced on.

**The client address is trusted only where something rewrites it.**
better-auth's `DEFAULT_IP_HEADERS` is already `['x-forwarded-for']`, so the
header is trusted unless configured otherwise — which means the explicit
configuration is needed for the *untrusted* case, not the trusted one. Where
nothing in front rewrites the header, `ipAddressHeaders` is set to `[]` (not
`undefined`, which restores the default) so no address resolves and every
client shares one bucket per endpoint. Vercel rewrites the header itself and
is detected automatically; a self-hosted deployment behind a reverse proxy
opts in with `TRUST_PROXY_HEADERS=1`.

**`robots.ts` and `sitemap.ts` derive from the registry** — gated prefixes
disallowed, public listings and module indexes listed with hreflang, no
resource detail pages. Both are `force-dynamic`, because the canonical origin
is runtime server env and prerendering would bake in the build's idea of it.

## Consequences

- **A nonce CSP requires every page to render dynamically.** That price is
  already paid — every route under `src/app` is `force-dynamic` — but it is
  now load-bearing rather than incidental. **Partial Prerendering and Cache
  Components are incompatible with a nonce-based CSP.** If this project later
  adopts them, this decision must be revisited by a superseding ADR: the
  options are hash-based CSP via Next's experimental `sri`, or accepting a
  weaker `script-src`. Do not quietly drop the nonce to make caching work.
- The nonce reaches the renderer on the *request*, because that is where Next
  looks for it. This works only because next-intl copies incoming request
  headers into the rewrite it issues. A change in next-intl's middleware could
  break it silently, so an e2e test asserts the rendered script tags carry the
  nonce from the response header.
- `CSP_REPORT_ONLY=1` switches the response header to the report-only
  spelling. Roll out a policy change with it set, confirm a clean console,
  then unset it.
- A module can widen `frame-src` by declaring `frameSrc`. That is the intended
  seam, and it is narrow: a module that stops embedding narrows the policy
  without anyone editing it. `defineModule` stays an identity function — the
  manifest is reached by the middleware and must remain pure data — so the
  constraint that entries are bare https origins (no path, no wildcard, no CSP
  keyword) is enforced by the registry contract test, alongside the rest of
  the manifest rules, and fails `bun run verify`.
- On a directly-exposed deployment, rate limiting is coarse: one bucket per
  endpoint for everybody, so a determined attacker can exhaust the sign-in
  budget and inconvenience real users. This is the lesser harm — the
  alternative lets them forge an address and escape the limit entirely — and
  it costs legitimate users nothing they were not already paying, since a
  browser talking to the server directly sends no `x-forwarded-for` either.
  **Run behind a proxy and set `TRUST_PROXY_HEADERS=1`** — but only once the
  app is reachable *solely* through that proxy. The flag and the network
  topology are one decision, not two: turning it on while the container is
  still published on every interface (which `docker-compose.yml` does by
  default) lets a client bypass the proxy, forge the header and mint a fresh
  bucket per request, which is strictly worse than leaving it off. better-auth
  also offers `advanced.ipAddress.trustedProxies` for picking the right entry
  out of a multi-hop forwarding chain; adopting it is the upgrade path if a
  deployment needs finer control.
- Rate limiting is live during `bun run test:e2e`, which builds and serves in
  production mode. The suite's credential requests stay inside the rules
  today; a spec that adds sign-in attempts has to count them.
