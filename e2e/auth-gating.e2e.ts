import { expect, test } from '@playwright/test'
import { ADMIN } from '../playwright.config'

// These tests start signed out.
test.use({ storageState: { cookies: [], origins: [] } })

test('gated detail redirects to sign-in and returns after login', async ({
  page,
}) => {
  await page.goto('/en/tools/forge')
  await expect(page).toHaveURL(/\/en\/sign-in\?next=/)

  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/en\/tools\/forge$/)
  await expect(page.getByRole('heading', { name: 'Forge' })).toBeVisible()
})

test('admin area redirects signed-out visitors to sign-in', async ({
  page,
}) => {
  await page.goto('/zh/admin')
  await expect(page).toHaveURL(/\/zh\/sign-in\?next=/)
})

test('public listing is reachable without a session', async ({ page }) => {
  await page.goto('/en/tools')
  await expect(
    page.getByRole('heading', { name: 'Tool catalog' }),
  ).toBeVisible()
  await expect(page.getByText('Forge')).toBeVisible()
})
