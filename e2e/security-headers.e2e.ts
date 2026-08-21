import { expect, test } from '@playwright/test'

// The unit tests prove the policy string is right. Only a browser can prove
// the policy is *survivable*: that Next received the nonce, stamped it onto
// its own script tags, and that nothing the app renders trips the policy.

const ENFORCED = 'content-security-policy'
const REPORT_ONLY = 'content-security-policy-report-only'

// Read whichever spelling the server is configured to send. Playwright merges
// process.env into the webServer's environment, so a CSP_REPORT_ONLY=1 left in
// a shell or .env — exactly what someone trialling the flag would have — moves
// the policy to the other header. Assertions that hard-coded one name failed
// with an empty string, which reads as "the CSP is broken" rather than "the
// suite looked in the wrong place".
function policyOf(headers: Record<string, string>): string {
  return headers[ENFORCED] ?? headers[REPORT_ONLY] ?? ''
}

test.describe('security headers', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  // The flag's whole purpose is a safe rollout, so which header it selects is
  // worth pinning end to end rather than only over cspHeaderName().
  test('sends exactly one CSP header, the one CSP_REPORT_ONLY selects', async ({
    page,
  }) => {
    const headers = (await page.goto('/en'))?.headers() ?? {}
    const reportOnly = process.env.CSP_REPORT_ONLY === '1'
    expect(headers[reportOnly ? REPORT_ONLY : ENFORCED]).toBeTruthy()
    expect(headers[reportOnly ? ENFORCED : REPORT_ONLY]).toBeUndefined()
  })

  test('baseline headers ride every response', async ({ page }) => {
    const response = await page.goto('/en')
    const headers = response?.headers() ?? {}
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
  })

  // HSTS over plain http would pin localhost for its max-age. The e2e server
  // is http, so its absence here is the assertion.
  test('HSTS stays off over plain http', async ({ page }) => {
    const response = await page.goto('/en')
    expect(response?.headers()['strict-transport-security']).toBeUndefined()
  })

  test('the CSP nonce reaches the scripts Next renders', async ({ page }) => {
    const response = await page.goto('/en')
    const csp = policyOf(response?.headers() ?? {})
    expect(csp).toContain("'strict-dynamic'")

    const nonce = csp.match(/'nonce-([^']+)'/)?.[1]
    expect(nonce).toBeTruthy()

    // Read the IDL property, not the attribute: browsers blank out the nonce
    // *attribute* once parsed so a `[nonce=…]` CSS selector cannot exfiltrate
    // it, which also means `script[nonce="…"]` matches nothing here.
    //
    // Zero of these means the nonce never made it through the intl rewrite
    // onto the request, and a real browser would block every script.
    const nonced = await page.evaluate(
      (expected) =>
        [...document.querySelectorAll('script')].filter(
          (script) => script.nonce === expected,
        ).length,
      nonce,
    )
    expect(nonced).toBeGreaterThan(0)
  })

  // The e2e server is a production build served over plain http, which is the
  // deployment that used to break: upgrade-insecure-requests keyed on the
  // build mode, so it was sent here too, and a browser on a non-localhost
  // address would have upgraded every /_next/static/* request to a port with
  // no TLS listener. localhost is exempt from the upgrade, so the page kept
  // working and the suite kept passing — assert on the header, not the page.
  test('does not tell a plain-http deployment to upgrade its own assets', async ({
    page,
  }) => {
    const csp = policyOf((await page.goto('/en'))?.headers() ?? {})
    expect(csp).toBeTruthy()
    expect(csp).not.toContain('upgrade-insecure-requests')
  })

  test('does upgrade insecure requests once the request arrives over https', async ({
    request,
  }) => {
    // The same server, told it sits behind a TLS-terminating proxy.
    const response = await request.get('/en', {
      headers: { 'x-forwarded-proto': 'https' },
    })
    expect(policyOf(response.headers())).toContain('upgrade-insecure-requests')
  })

  test('a fresh nonce per request', async ({ page }) => {
    const first = policyOf((await page.goto('/en'))?.headers() ?? {})
    const second = policyOf((await page.goto('/en/tools'))?.headers() ?? {})
    // Both, not just the first: policyOf returns '' for a response with no
    // policy at all, and '' differs from a real one — so a route that stopped
    // sending a CSP would read as a freshly generated nonce.
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(first).not.toBe(second)
  })

  test('the app renders without tripping its own policy', async ({ page }) => {
    const violations: string[] = []
    page.on('console', (message) => {
      const text = message.text()
      if (/Content Security Policy|Refused to/i.test(text)) {
        violations.push(text)
      }
    })

    // The pages that exercise the policy's edges: the landing (inline
    // decorative styles), a listing, and an auth form (client components).
    for (const path of ['/en', '/en/tools', '/en/sign-in']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
    expect(violations).toEqual([])
  })
})

test.describe('signed in', () => {
  test('the declared video host is framable under the policy', async ({
    page,
  }) => {
    const response = await page.goto(
      '/en/help/videos/getting-started-with-silicon',
    )
    const csp = policyOf(response?.headers() ?? {})
    const iframe = page.locator('iframe')
    await expect(iframe).toBeVisible()

    // The host the page actually embeds has to appear in frame-src, or the
    // player is a blank box. This is the pairing the manifest's `frameSrc`
    // exists to keep honest.
    const src = await iframe.getAttribute('src')
    const origin = new URL(src ?? '').origin

    // Matched as a source token, not as a substring of the whole policy:
    // `toContain(origin)` would also pass on https://www.youtube.com.evil.test,
    // and would not care which directive the origin turned up in.
    const frameSrc = csp
      .split('; ')
      .find((part) => part.startsWith('frame-src '))
      ?.split(/\s+/)
      .slice(1)
    expect(frameSrc).toBeDefined()
    expect(frameSrc).toContain(origin)
  })
})
