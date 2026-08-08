import { expect, test } from '@playwright/test'

test.describe('public smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('home renders hero, bento, and latest additions', async ({ page }) => {
    await page.goto('/en')
    // Asserted line by line: the headline is one h1 split across two spans,
    // so its accessible name depends on how the two are joined.
    const hero = page.getByRole('heading', { level: 1 })
    await expect(hero).toContainText('One portal')
    await expect(hero).toContainText('the entire toolchain')
    await expect(
      page.getByRole('heading', { name: 'Every resource, one system' }),
    ).toBeVisible()
    await expect(page.getByText('Latest additions')).toBeVisible()
    // The footer is rendered by the shared layout, so this covers every page.
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  // Guards the rule in ADR 0008: the imported design advertised SSO, a ⌘K
  // global search, a `porta keys create` CLI and course progress, none of
  // which exist. Re-pasting that copy should fail rather than ship.
  test('landing claims nothing the product does not do', async ({ page }) => {
    await page.goto('/en')
    for (const claim of [
      'Sign in with SSO',
      '⌘K',
      'porta keys create',
      'OPERATIONAL',
      'completed',
    ]) {
      await expect(page.getByText(claim)).toHaveCount(0)
    }
  })

  test('section links stay reachable on a phone', async ({ page }) => {
    // The desktop nav is `max-sm:hidden`; below that the sheet is the only
    // way in, so it is worth a test rather than a hover check.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/en')
    await page.getByRole('button', { name: 'Menu' }).click()
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Courses' })
      .click()
    await expect(page).toHaveURL(/\/en\/courses$/)
  })

  test('all four section listings respond', async ({ page }) => {
    for (const [path, heading] of [
      ['/en/tools', 'Tools'],
      ['/en/courses', 'Courses'],
      ['/en/videos', 'Videos'],
      ['/en/models', 'Model APIs'],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })

  test('draft resources never surface publicly', async ({ page }) => {
    await page.goto('/en/tools')
    await expect(page.getByText('Secret draft tool')).toHaveCount(0)
  })
})

test.describe('signed in', () => {
  test('video detail embeds the provider player', async ({ page }) => {
    await page.goto('/en/videos/getting-started-with-silicon')
    await expect(page.locator('iframe[src*="youtube.com"]')).toBeVisible()
  })

  test('course chapters navigate with prev/next', async ({ page }) => {
    await page.goto('/en/courses/prompt-engineering-101')
    await page.getByRole('link', { name: /Why prompts matter/ }).click()
    await expect(page).toHaveURL(/\/courses\/prompt-engineering-101\/1$/)
    await page.getByRole('link', { name: /Next/ }).click()
    await expect(page).toHaveURL(/\/courses\/prompt-engineering-101\/2$/)
  })

  test('a non-numeric chapter segment 404s instead of rendering', async ({
    page,
  }) => {
    const res = await page.goto('/en/courses/prompt-engineering-101/1abc')
    expect(res?.status()).toBe(404)
  })
})
