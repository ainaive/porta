import { expect, test } from '@playwright/test'

test.describe('public smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('home renders hero, section cards, and latest additions', async ({
    page,
  }) => {
    await page.goto('/en')
    await expect(
      page.getByRole('heading', { name: 'The ecosystem toolchain portal' }),
    ).toBeVisible()
    await expect(page.getByText('Latest additions')).toBeVisible()
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
    await page.goto('/en/videos/getting-started-with-porta')
    await expect(page.locator('iframe[src*="youtube.com"]')).toBeVisible()
  })

  test('course chapters navigate with prev/next', async ({ page }) => {
    await page.goto('/en/courses/prompt-engineering-101')
    await page.getByRole('link', { name: /Why prompts matter/ }).click()
    await expect(page).toHaveURL(/\/courses\/prompt-engineering-101\/1$/)
    await page.getByRole('link', { name: /Next/ }).click()
    await expect(page).toHaveURL(/\/courses\/prompt-engineering-101\/2$/)
  })
})
