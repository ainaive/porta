import { expect, type Page, test } from '@playwright/test'

// What only a running server proves about page metadata: that the pages the
// sitemap advertises actually say what they are. The unit tests cover the
// derivation (src/lib/metadata.test.ts) and the registry contract
// (src/core/module/registry.test.ts); this covers the wiring between them —
// a factory that stopped being re-exported from a route mount would leave
// the page inheriting the landing's title, and nothing else would notice.

/** Every locale-prefixed URL in sitemap.xml, which is the registry's own list
 *  of the public surface. Reading it here rather than importing publicPaths
 *  keeps the test honest: it checks what the app publishes, not what the
 *  source says it publishes. */
async function advertisedUrls(page: Page, baseURL: string): Promise<string[]> {
  const response = await page.request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const body = await response.text()
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  // A sitemap that came back empty would make every assertion below vacuous.
  expect(urls.length).toBeGreaterThan(4)
  for (const url of urls) expect(url.startsWith(baseURL)).toBe(true)
  return urls
}

function headOf(html: string, pattern: RegExp, what: string): string {
  const match = html.match(pattern)
  expect(match, `no ${what} in the rendered document`).not.toBeNull()
  return (match as RegExpMatchArray)[1]
}

test.describe('public page metadata', () => {
  // The crawler's view: signed out.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('every advertised URL has a title and description of its own', async ({
    page,
    baseURL,
  }) => {
    const urls = await advertisedUrls(page, baseURL as string)

    const byLocale = new Map<
      string,
      { titles: string[]; descriptions: string[] }
    >()
    for (const url of urls) {
      const locale = new URL(url).pathname.split('/')[1]
      const response = await page.request.get(url)
      expect(response.status(), url).toBe(200)
      const html = await response.text()

      const title = headOf(html, /<title>([^<]*)<\/title>/, `title for ${url}`)
      const description = headOf(
        html,
        /<meta name="description" content="([^"]*)"/,
        `description for ${url}`,
      )
      expect(title.trim(), url).not.toBe('')
      expect(description.trim(), url).not.toBe('')

      const bucket = byLocale.get(locale) ?? { titles: [], descriptions: [] }
      bucket.titles.push(title)
      bucket.descriptions.push(description)
      byLocale.set(locale, bucket)
    }

    // The regression this exists for: before the page factories carried
    // metadata, all ten of these rendered the landing's title and the
    // landing's description — every URL the sitemap advertises, duplicated.
    for (const [locale, { titles, descriptions }] of byLocale) {
      expect({ [locale]: new Set(titles).size }).toEqual({
        [locale]: titles.length,
      })
      expect({ [locale]: new Set(descriptions).size }).toEqual({
        [locale]: descriptions.length,
      })
    }
  })

  test('an advertised page claims itself and cross-links the other locale', async ({
    page,
    baseURL,
  }) => {
    for (const path of ['/en', '/en/tools', '/zh/help/courses']) {
      await page.goto(path)
      // The canonical is the same string the sitemap publishes: both come
      // from localeUrls, so they cannot drift apart.
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${baseURL}${path}`,
      )
      const otherLocale = path.startsWith('/en') ? 'zh' : 'en'
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${otherLocale}"]`),
      ).toHaveAttribute(
        'href',
        `${baseURL}${path.replace(/^\/(en|zh)/, `/${otherLocale}`)}`,
      )
    }
  })

  test('a gated detail page is never advertised', async ({ page, baseURL }) => {
    const urls = await advertisedUrls(page, baseURL as string)
    // Listings are public and listed; what hangs off them needs a session and
    // must not be (ADR 0016). Guarded in seo.test.ts too, but a rendered
    // sitemap is the thing a crawler actually reads.
    expect(urls.filter((url) => url.includes('/tools/'))).toEqual([])
  })
})

test.describe('keyboard entry', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  // Below the skip link sit the phone menu, the brand link, every section
  // link, search and the locale toggle — tabbed through again after every
  // navigation without this.
  test('the first tab stop skips the chrome and lands in the content', async ({
    page,
  }) => {
    await page.goto('/en/tools')
    await page.keyboard.press('Tab')

    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()

    await page.keyboard.press('Enter')
    // tabIndex={-1} on the landmark is what makes this focus rather than just
    // scroll; without it the next Tab would resume inside the header.
    await expect(page.locator('#main-content')).toBeFocused()
  })
})

test.describe('outside the locale tree', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  // The proxy matcher skips anything containing a dot, so these never reach
  // next-intl's locale rewrite and land on the root not-found instead of
  // /en/…. Crawlers ask for them routinely.
  test('a dotted path gets the styled 404, not the framework default', async ({
    page,
  }) => {
    const response = await page.request.get('/apple-touch-icon.png')
    expect(response.status()).toBe(404)
    expect(await response.text()).toContain('Page not found')
  })
})
