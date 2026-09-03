import { expect, test } from '@playwright/test'

test.describe('public smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('home renders every band of the overview', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Every tool, guide and session',
    )
    // The bands are h2s, so the page still reads as an outline.
    for (const band of [
      'Start here',
      'Recently added',
      'Next up',
      'The catalog',
    ]) {
      await expect(page.getByRole('heading', { name: band })).toBeVisible()
    }
    // The footer is rendered by the shared layout, so this covers every page.
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  test('the hero search box reaches the global search', async ({ page }) => {
    // A plain GET form, so this also proves the main path needs no
    // JavaScript beyond what the browser does for a form.
    await page.goto('/en')
    await page.getByRole('searchbox', { name: 'Search' }).fill('forge')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page).toHaveURL(/\/en\/search\?q=forge$/)
    await expect(
      page.getByRole('main').getByRole('link', { name: /Forge/ }),
    ).toBeVisible()
  })

  // Guards the rule in ADR 0008, re-aimed at the design this page came from.
  // That artboard was a mock of a fictional product — a `wb` CLI with an
  // install script, a "Workbench" wordmark, per-tool install counts and
  // quarterly CLI telemetry. None of it exists. Re-pasting that copy should
  // fail rather than ship.
  test('the overview claims nothing the product does not do', async ({
    page,
  }) => {
    for (const path of ['/en', '/en/adoption', '/en/start']) {
      await page.goto(path)
      for (const claim of [
        'wb install',
        'wb doctor',
        'wb login',
        'Workbench',
        'all systems nominal',
        'Active CLI users',
        'Median CI duration',
        'Drop-off at install',
      ]) {
        await expect(page.getByText(claim)).toHaveCount(0)
      }
    }
  })

  test('section links stay reachable on a phone', async ({ page }) => {
    // The desktop nav is `max-sm:hidden`; below that the sheet is the only
    // way in, so it is worth a test rather than a hover check.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/en')
    await page.getByRole('button', { name: 'Menu' }).click()
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Docs & guides' })
      .click()
    await expect(page).toHaveURL(/\/en\/docs$/)
  })

  test('every section listing responds', async ({ page }) => {
    for (const [path, heading] of [
      ['/en/tools', 'Tool catalog'],
      ['/en/docs', 'Docs & guides'],
      ['/en/start', 'Getting started'],
      ['/en/events', 'Events & workshops'],
      ['/en/adoption', 'Adoption'],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })

  test('the overview links into every section it shows', async ({ page }) => {
    await page.goto('/en')
    const main = page.getByRole('main')

    // "Start here" is fed by the published tracks, so the first card has to
    // reach a track detail page rather than a hand-written destination.
    await main.getByRole('link').filter({ hasText: /^0\d/ }).first().click()
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fen%2Fstart%2F.+/)

    await page.goto('/en')
    await main.getByRole('link', { name: 'All events' }).click()
    await expect(page).toHaveURL(/\/en\/events$/)

    await page.goto('/en')
    await main.getByRole('link', { name: 'Adoption in detail' }).click()
    await expect(page).toHaveURL(/\/en\/adoption$/)
  })

  test('the adoption page counts the catalog and invents nothing', async ({
    page,
  }) => {
    await page.goto('/en/adoption')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Adoption',
    )
    await expect(
      page.getByRole('heading', { name: /Coverage by section/ }),
    ).toBeVisible()
    // Every section with content gets a coverage row.
    await expect(page.getByText('Tool catalog')).not.toHaveCount(0)
  })

  test('draft resources never surface publicly', async ({ page }) => {
    await page.goto('/en/tools')
    await expect(page.getByText('Secret draft tool')).toHaveCount(0)
  })

  test('forgot-password shows a non-committal confirmation', async ({
    page,
  }) => {
    await page.goto('/en/sign-in')
    await page.getByRole('link', { name: 'Forgot your password?' }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await page.getByLabel('Email').fill('someone@example.test')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/reset link is on its way/)).toBeVisible()
  })

  test('reset-password without a token is rejected', async ({ page }) => {
    await page.goto('/en/reset-password')
    await expect(page.getByText(/invalid or has expired/)).toBeVisible()
  })

  test('section search filters the listing', async ({ page }) => {
    await page.goto('/en/tools?q=trace')
    await expect(page.getByText('Lens')).toBeVisible()
    await expect(page.getByText('Gatekeeper')).toHaveCount(0)

    // A query that matches nothing lands on the empty state.
    await page.goto('/en/tools?q=zzzznomatchzzzz')
    await expect(page.getByText('Nothing here yet.')).toBeVisible()
  })
})

test.describe('signed in', () => {
  test('track steps navigate with prev/next', async ({ page }) => {
    await page.goto('/en/start/shipping-a-new-service')
    await page.getByRole('link', { name: /Scaffold with Forge/ }).click()
    await expect(page).toHaveURL(/\/start\/shipping-a-new-service\/1$/)
    await page.getByRole('link', { name: /Next/ }).click()
    await expect(page).toHaveURL(/\/start\/shipping-a-new-service\/2$/)
  })

  test('a non-numeric step segment shows not-found, not step 1', async ({
    page,
  }) => {
    // Dynamic/streaming pages can't rewind an already-committed 200, so assert
    // the not-found UI renders (the codebase's convention) rather than status.
    await page.goto('/en/start/shipping-a-new-service/1abc')
    await expect(page.getByText('Page not found')).toBeVisible()
  })

  test('the account page updates the profile name', async ({ page }) => {
    await page.goto('/en/account')
    await page.getByLabel('Name').fill('Renamed Admin')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Profile updated')).toBeVisible()
  })
})
