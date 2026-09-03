import { expect, test } from '@playwright/test'

// A module that moves its URLs declares the old ones in its manifest
// (src/modules/*/module.ts) and the proxy applies them. The ordering is the
// part worth testing: redirect runs before the auth gate, or a signed-out
// visitor's `next=` would point at a path that no longer exists.
test.use({ storageState: { cookies: [], origins: [] } })

test('the old handbook paths redirect to their new homes', async ({ page }) => {
  await page.goto('/en/help/courses')
  await expect(page).toHaveURL(/\/en\/start$/)

  await page.goto('/en/help/guides')
  await expect(page).toHaveURL(/\/en\/docs$/)
})

test('a redirect keeps its query string', async ({ page }) => {
  await page.goto('/zh/help/guides?q=invite')
  await expect(page).toHaveURL(/\/zh\/docs\?q=invite$/)
})

test('a moved detail link lands on the new gated URL, not the old one', async ({
  page,
}) => {
  await page.goto('/en/help/courses/shipping-a-new-service/2')
  await expect(page).toHaveURL(
    /\/en\/sign-in\?next=%2Fen%2Fstart%2Fshipping-a-new-service%2F2$/,
  )
})
