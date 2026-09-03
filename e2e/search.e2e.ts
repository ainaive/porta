import { expect, type Page, test } from '@playwright/test'

/** The section filter chips. They repeat the section names already in the
 *  header and the footer, so every assertion about them has to say which of
 *  the three lists it means. */
const filters = (page: Page) =>
  page.getByRole('navigation', { name: 'Filter by section' })

// The DB tests cover what searchPublished returns. What only a running server
// proves: that a signed-out visitor can reach the page, that one query really
// does cross section boundaries, and that the filter chips are wired to the
// registry rather than to a list somebody has to remember to extend.

test.describe('global search', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('one query finds resources in more than one section', async ({
    page,
  }) => {
    // "gatekeeper" names a tool and appears in a doc's summary — sections
    // owned by two different modules. Per-section search could never return
    // both.
    await page.goto('/en/search?q=gatekeeper')
    const results = page.getByRole('main')
    // Scoped to main: the section names also appear in the header nav, the
    // footer and the filter chips, so an unscoped match is ambiguous.
    const tool = results.getByRole('link', {
      name: /Runs policy and compliance checks/,
    })
    const guide = results.getByRole('link', {
      name: /Fixing a failed CI check/,
    })
    await expect(tool).toBeVisible()
    await expect(guide).toBeVisible()
    // Cards from a cross-section result have to name their section — a title
    // alone does not say whether you found a tool or the guide about it.
    await expect(tool).toContainText('Tool catalog')
    await expect(guide).toContainText('Docs & guides')
  })

  test('a signed-out visitor can search and reach the sign-in wall', async ({
    page,
  }) => {
    await page.goto('/en/search?q=gatekeeper')
    await page
      .getByRole('main')
      .getByRole('link', { name: /Runs policy and compliance checks/ })
      .click()
    // Results are public; the resource behind one is not (gating tier 2).
    await expect(page).toHaveURL(/\/sign-in\?next=/)
  })

  test('the section filter narrows the results', async ({ page }) => {
    await page.goto('/en/search?q=gatekeeper')
    await filters(page).getByRole('link', { name: 'Docs & guides' }).click()
    await expect(page).toHaveURL(/type=doc/)

    const results = page.getByRole('main')
    await expect(
      results.getByRole('link', { name: /Fixing a failed CI check/ }),
    ).toBeVisible()
    await expect(
      results.getByRole('link', { name: /Runs policy and compliance checks/ }),
    ).toHaveCount(0)
  })

  test('every registered section offers a filter chip', async ({ page }) => {
    await page.goto('/en/search?q=gatekeeper')
    // Derived from the registry, so this is the guard against the chips
    // drifting back into a hand-kept list.
    for (const section of [
      'Tool catalog',
      'Docs & guides',
      'Getting started',
      'Events & workshops',
    ]) {
      await expect(
        filters(page).getByRole('link', { name: section, exact: true }),
      ).toBeVisible()
    }
  })

  test('an empty query prompts instead of dumping the catalog', async ({
    page,
  }) => {
    await page.goto('/en/search')
    await expect(page.getByText('Type something to search')).toBeVisible()
    await expect(
      page
        .getByRole('main')
        .getByRole('link', { name: /Runs policy and compliance checks/ }),
    ).toHaveCount(0)
    // No results means no filter chips either.
    await expect(filters(page)).toHaveCount(0)
  })

  test('a query that matches nothing says so', async ({ page }) => {
    await page.goto('/en/search?q=zzzznomatchzzzz')
    await expect(page.getByText(/Nothing matched/)).toBeVisible()
  })

  test('an unknown section filter searches everything instead of 404ing', async ({
    page,
  }) => {
    // A stale filter link is a reason to search wider, not to refuse.
    await page.goto('/en/search?q=gatekeeper&type=retired_section')
    await expect(
      page
        .getByRole('main')
        .getByRole('link', { name: /Runs policy and compliance checks/ }),
    ).toBeVisible()
  })

  test('the header search link reaches the page', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('link', { name: 'Search', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/search$/)
  })
})
