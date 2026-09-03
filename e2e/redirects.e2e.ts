import { expect, test } from '@playwright/test'

// A module that moves its URLs declares the old ones in its manifest
// (src/modules/*/module.ts) and the proxy applies them. Old links are shared
// in chat and bookmarked, so this is a contract, not a nicety.
test.use({ storageState: { cookies: [], origins: [] } })

test('the old course path redirects into Help & Tutorials', async ({
  page,
}) => {
  await page.goto('/en/courses')
  await expect(page).toHaveURL(/\/en\/help\/courses$/)
})

test('a redirect keeps its query string', async ({ page }) => {
  await page.goto('/zh/courses?q=prompt')
  await expect(page).toHaveURL(/\/zh\/help\/courses\?q=prompt$/)
})

test('a positional chapter URL survives the move', async ({ page }) => {
  await page.goto('/en/courses/prompt-engineering-101/2')
  await expect(page).toHaveURL(
    /\/en\/sign-in\?next=%2Fen%2Fhelp%2Fcourses%2Fprompt-engineering-101%2F2$/,
  )
})
