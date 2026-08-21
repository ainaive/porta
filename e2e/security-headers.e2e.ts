import { expect, test } from '@playwright/test'

// The unit tests prove the policy string is right. Only a browser can prove
// the policy is *survivable*: that Next received the nonce, stamped it onto
// its own script tags, and that nothing the app renders trips the policy.

test.describe('security headers', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

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
    const csp = response?.headers()['content-security-policy'] ?? ''
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

  test('a fresh nonce per request', async ({ page }) => {
    const first = (await page.goto('/en'))?.headers()['content-security-policy']
    const second = (await page.goto('/en/tools'))?.headers()[
      'content-security-policy'
    ]
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
    const csp = response?.headers()['content-security-policy'] ?? ''
    const iframe = page.locator('iframe')
    await expect(iframe).toBeVisible()

    // The host the page actually embeds has to appear in frame-src, or the
    // player is a blank box. This is the pairing the manifest's `frameSrc`
    // exists to keep honest.
    const src = await iframe.getAttribute('src')
    const origin = new URL(src ?? '').origin
    expect(csp).toContain(`frame-src`)
    expect(csp).toContain(origin)
  })
})
