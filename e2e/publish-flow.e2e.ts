import { expect, test } from '@playwright/test'

test('draft → translate → publish → publicly visible', async ({ page }) => {
  const slug = `e2e-pub-${Date.now()}`
  const title = `E2E Published ${Date.now()}`

  await page.goto('/en/admin/resources/new')
  await page.getByLabel('Type').selectOption('tool')
  await page.getByLabel('Slug').fill(slug)
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/\/en\/admin\/resources\/[0-9a-f-]{36}$/)
  const editUrl = page.url()

  // Add the English translation while still a draft.
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved')).toBeVisible()

  // Drafts never appear publicly.
  await page.goto('/en/tools')
  await expect(page.getByText(title)).toHaveCount(0)

  // Publish from the settings tab.
  await page.goto(editUrl)
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Status').selectOption('published')
  await page.getByRole('button', { name: 'Save' }).click()

  // Gate on persisted state, not the feedback text: reload the editor and
  // require the stored status to read back as published before moving on.
  await expect(async () => {
    await page.goto(editUrl)
    await page.getByRole('tab', { name: 'Settings' }).click()
    await expect(page.getByLabel('Status')).toHaveValue('published')
  }).toPass({ timeout: 10_000 })

  // Now it's live: listed and readable.
  await page.goto('/en/tools')
  await expect(page.getByText(title)).toBeVisible()
  await page.getByRole('link', { name: title }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
})
