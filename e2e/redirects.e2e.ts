import { expect, test } from '@playwright/test'

// A module that moves its URLs declares the old ones in its manifest
// (src/modules/*/module.ts) and the proxy applies them. Old links are shared
// in chat and bookmarked, so this is a contract, not a nicety.
test.use({ storageState: { cookies: [], origins: [] } })

test('the old model catalog path redirects into AI Evaluation', async ({
  page,
}) => {
  await page.goto('/en/models')
  await expect(page).toHaveURL(/\/en\/evals\/models$/)
  await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible()
})

test('a deep link redirects and keeps its query string', async ({ page }) => {
  await page.goto('/zh/models?q=silicon')
  await expect(page).toHaveURL(/\/zh\/evals\/models\?q=silicon$/)
})

test('a moved detail link lands on the new gated URL, not the old one', async ({
  page,
}) => {
  // Signed out: the redirect must run before the auth gate, or `next=` would
  // send the visitor back to a path that no longer exists.
  await page.goto('/en/models/claude-api')
  await expect(page).toHaveURL(
    /\/en\/sign-in\?next=%2Fen%2Fevals%2Fmodels%2Fclaude-api$/,
  )
})

test('the old course and video paths redirect into Help & Tutorials', async ({
  page,
}) => {
  await page.goto('/en/courses')
  await expect(page).toHaveURL(/\/en\/help\/courses$/)

  await page.goto('/en/videos')
  await expect(page).toHaveURL(/\/en\/help\/videos$/)
})

test('a positional chapter URL survives the move', async ({ page }) => {
  await page.goto('/en/courses/prompt-engineering-101/2')
  await expect(page).toHaveURL(
    /\/en\/sign-in\?next=%2Fen%2Fhelp%2Fcourses%2Fprompt-engineering-101%2F2$/,
  )
})
