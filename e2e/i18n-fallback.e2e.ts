import { expect, test } from '@playwright/test'

// The i18n behavior must hold for anonymous visitors.
test.use({ storageState: { cookies: [], origins: [] } })

test('zh chrome renders and en-only content is badged untranslated', async ({
  page,
}) => {
  await page.goto('/zh/tools')
  // Scoped to the header: the footer carries the same section links.
  await expect(
    page.getByRole('banner').getByRole('link', { name: '课程' }),
  ).toBeVisible()

  // ci-dashboard is seeded English-only → falls back with a badge on /zh.
  const card = page.getByRole('link', { name: /CI Dashboard/ })
  await expect(card).toContainText('未翻译')
})

test('zh-only content is badged untranslated on /en', async ({ page }) => {
  await page.goto('/en/tools')
  const card = page.getByRole('link', { name: /内部镜像源/ })
  await expect(card).toContainText('Untranslated')
})

test('locale switcher toggles the same page between locales', async ({
  page,
}) => {
  await page.goto('/en/tools')
  await page.getByRole('button', { name: '中文' }).click()
  await expect(page).toHaveURL(/\/zh\/tools$/)
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/en\/tools$/)
})
