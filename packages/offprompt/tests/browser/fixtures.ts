import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

/**
 * A browser is slow to open its first page while it starts up: Firefox on a Windows runner
 * has taken longer than a whole test to. Playwright starts the browser outside any test's
 * time but opens each page inside it, so each worker opens a first page before its first
 * test, with time of its own, and a test's time is spent on the page it tests.
 */
export const test = base.extend<Record<never, never>, { firstPage: void }>({
  firstPage: [
    async ({ browser }, use) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.route('https://first.test/', route =>
        route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>first</title><p>The first page.</p>' }),
      )
      await page.goto('https://first.test/')
      await context.close()
      await use()
    },
    { scope: 'worker', auto: true, timeout: 120_000 },
  ],
})
