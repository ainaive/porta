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
    // "silicon" appears in a tool's title and in a video's — sections owned by
    // two different modules. Per-section search could never return both.
    await page.goto('/en/search?q=silicon')
    const results = page.getByRole('main')
    // Scoped to main: the section names also appear in the header nav, the
    // footer and the filter chips, so an unscoped match is ambiguous.
    const tool = results.getByRole('link', { name: /Silicon CLI/ })
    const video = results.getByRole('link', {
      name: /Getting started with Silicon Ecosystem/,
    })
    await expect(tool).toBeVisible()
    await expect(video).toBeVisible()
    // Cards from a cross-section result have to name their section — a title
    // alone does not say whether you found a tool or the video about it.
    await expect(tool).toContainText('Tool Shelf')
    await expect(video).toContainText('Videos')
  })

  test('a signed-out visitor can search and reach the sign-in wall', async ({
    page,
  }) => {
    await page.goto('/en/search?q=silicon')
    await page
      .getByRole('main')
      .getByRole('link', { name: /Silicon CLI/ })
      .click()
    // Results are public; the resource behind one is not (gating tier 2).
    await expect(page).toHaveURL(/\/sign-in\?next=/)
  })

  test('the section filter narrows the results', async ({ page }) => {
    await page.goto('/en/search?q=silicon')
    await filters(page).getByRole('link', { name: 'Videos' }).click()
    await expect(page).toHaveURL(/type=video/)

    const results = page.getByRole('main')
    await expect(
      results.getByRole('link', {
        name: /Getting started with Silicon Ecosystem/,
      }),
    ).toBeVisible()
    await expect(
      results.getByRole('link', { name: /Silicon CLI/ }),
    ).toHaveCount(0)
  })

  test('every registered section offers a filter chip', async ({ page }) => {
    await page.goto('/en/search?q=silicon')
    // Derived from the registry, so this is the guard against the chips
    // drifting back into a hand-kept list.
    for (const section of [
      'Tool Shelf',
      'Agents',
      'Models',
      'Reports',
      'Courses',
      'Videos',
      'Guides',
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
      page.getByRole('main').getByRole('link', { name: /Silicon CLI/ }),
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
    await page.goto('/en/search?q=silicon&type=retired_section')
    await expect(
      page.getByRole('main').getByRole('link', { name: /Silicon CLI/ }),
    ).toBeVisible()
  })

  test('the header search link reaches the page', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('link', { name: 'Search', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/search$/)
  })
})
