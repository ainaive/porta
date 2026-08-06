import { expect, test as setup } from '@playwright/test'
import { ADMIN } from '../../playwright.config'

// The e2e database starts with zero users, so the first signup needs no
// invite and bootstraps as admin — same rule production relies on.
setup('bootstrap admin via first signup', async ({ page }) => {
  await page.goto('/en/sign-up')
  await page.getByLabel('Name').fill(ADMIN.name)
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0)

  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
