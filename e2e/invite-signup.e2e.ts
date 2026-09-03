import { expect, test } from '@playwright/test'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('invite → member signup → member is gated from admin', async ({
  page,
  browser,
}) => {
  // The e2e database is not reset between CI retries, so a constant email
  // would collide with the member created on a prior attempt; a random
  // component keeps it unique regardless of clock, worker, or run.
  const memberEmail = `member-${crypto.randomUUID()}@e2e.test`

  // Admin creates an invite and copies the link.
  await page.goto('/en/admin/invites')
  await page.getByRole('button', { name: 'Create invite' }).click()
  await expect(page.getByText('Saved')).toBeVisible()
  await page.getByRole('button', { name: 'Copy link' }).first().click()
  const inviteUrl = await page.evaluate(() => navigator.clipboard.readText())
  expect(inviteUrl).toContain('/en/sign-up?token=')

  // The invited person signs up in a fresh browser context.
  const memberContext = await browser.newContext()
  const memberPage = await memberContext.newPage()
  await memberPage.goto(inviteUrl)
  await expect(
    memberPage.getByText('You have been invited to Silicon Ecosystem.'),
  ).toBeVisible()
  await memberPage.getByLabel('Name').fill('Member E2E')
  await memberPage.getByLabel('Email').fill(memberEmail)
  await memberPage.getByLabel('Password').fill('member-pass-123')
  await memberPage.getByRole('button', { name: 'Create account' }).click()
  await expect(memberPage).toHaveURL(/\/en$/)

  // Members can open gated details…
  await memberPage.goto('/en/tools/forge')
  await expect(memberPage.getByRole('heading', { name: 'Forge' })).toBeVisible()

  // …but the admin area 404s for them (concealment, not a redirect).
  await memberPage.goto('/en/admin')
  await expect(memberPage.getByText('Page not found')).toBeVisible()
  await memberContext.close()

  // A consumed invite cannot be redeemed again.
  const strangerContext = await browser.newContext()
  const strangerPage = await strangerContext.newPage()
  await strangerPage.goto(inviteUrl)
  await expect(
    strangerPage.getByText(/invalid, expired, or already used/),
  ).toBeVisible()
  await strangerContext.close()
})
