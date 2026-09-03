import { expect, test } from '@playwright/test'

// The i18n behavior must hold for anonymous visitors.
test.use({ storageState: { cookies: [], origins: [] } })

test('zh chrome renders and en-only content is badged untranslated', async ({
  page,
}) => {
  await page.goto('/zh/tools')
  // Scoped to the header: the footer carries the same section links.
  await expect(
    page.getByRole('banner').getByRole('link', { name: '文档与指南' }),
  ).toBeVisible()

  // publishing-a-resource is seeded English-only → on /zh it falls back to
  // the English text and is badged for it.
  await page.goto('/zh/docs')
  const card = page.getByRole('link', { name: /Publishing a resource/ })
  await expect(card).toContainText('未翻译')
})

test('zh-only content is badged untranslated on /en', async ({ page }) => {
  await page.goto('/en/tools')
  // The catalog is a real table, so the badge and the title share a row
  // rather than being nested — assert on the row, not on the link.
  const row = page.getByRole('row').filter({ hasText: '内部镜像源' })
  await expect(row).toContainText('Untranslated')
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
