import { expect, test as setup } from '@playwright/test'
import { ADMIN } from '../../playwright.config'

// First signup on the fresh e2e database bootstraps as admin. On a CI retry
// the database is NOT recreated (prepare-db runs once per run, not per
// attempt), so the admin already exists and signup fails — fall back to
// signing in with the same credentials so the retry can still produce a
// valid storageState instead of failing forever.
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/en/sign-up')
  await page.getByLabel('Name').fill(ADMIN.name)
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  const bootstrapped = await page
    .waitForURL(/\/en$/, { timeout: 5_000 })
    .then(() => true)
    .catch(() => false)

  if (!bootstrapped) {
    await page.goto('/en/sign-in')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Password').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/en$/)
  }

  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0)
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
