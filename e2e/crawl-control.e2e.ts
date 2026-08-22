import { expect, test } from '@playwright/test'

// The unit tests cover what these documents say. What only a running server
// proves: that they are reachable at all. The proxy matcher excludes paths
// containing a dot, which is the sole reason /robots.txt and /sitemap.xml are
// not swallowed by next-intl's locale rewrite — a load-bearing accident worth
// a test.

test.describe('crawl control', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('robots.txt serves unrewritten and hides the gated paths', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)

    const body = await response.text()
    expect(body).toContain('Disallow: /en/admin')
    expect(body).toContain('Disallow: /en/tools/')
    expect(body).toContain('Sitemap:')
    // Rewritten to /en/robots.txt it would have come back as HTML.
    expect(body).not.toContain('<!DOCTYPE')
  })

  test('search stays crawlable so its noindex can be read', async ({
    page,
    request,
  }) => {
    // The trap this guards against: disallowing /search in robots.txt looks
    // like the stronger move, but a URL that is never fetched is a URL whose
    // noindex is never read — and the header links to /search from every
    // page, so Google would index the bare URL on link evidence alone. The
    // two must not both be applied (ADR 0016).
    const robots = await request.get('/robots.txt')
    const body = await robots.text()
    expect(body).not.toContain('Disallow: /en/search')
    expect(body).not.toContain('Disallow: /zh/search')

    // And the thing that actually keeps it out of the index is present.
    await page.goto('/en/search')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    )
  })

  test('sitemap.xml lists the public pages at the runtime origin', async ({
    request,
    baseURL,
  }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)

    const body = await response.text()
    // Read at runtime, not baked at build: a prerendered sitemap would carry
    // whatever origin the build knew, which for the container target is none.
    expect(body).toContain(`<loc>${baseURL}/en</loc>`)
    expect(body).toContain(`<loc>${baseURL}/en/tools</loc>`)
    expect(body).toContain('hreflang="zh"')
    // Gated detail pages are not public and must not be advertised.
    expect(body).not.toContain('/en/tools/')
    // Public, but an unbounded URL space — it stays out by never being
    // derived into publicPaths, and must not be added back (ADR 0016).
    expect(body).not.toContain('/en/search')
  })
})
