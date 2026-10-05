import { chromium } from '@playwright/test'

import { delay, readIfPresent } from './process.js'

/**
 * A page offprompt serves, local or sealed: on the loopback, or through a Cloudflare quick
 * tunnel, where it is always sealed to the key after its `#`.
 */
const PAGE_URL = /(?:http:\/\/127\.0\.0\.1:\d+|https:\/\/[a-z0-9-]+\.trycloudflare\.com)\/r\/[0-9a-f]+(?:#k=[\w-]+)?/g

/**
 * A page's address, from wherever it surfaced: the opener offprompt called, or the MCP
 * traffic, where it travels when the agent shows it in its own dialog or in the result.
 * The first one not among those already filled; gives up once the agent has finished.
 */
export const waitForPage = async ({
  sources,
  finished,
  filled = [],
}: {
  sources: readonly string[]
  finished: AbortSignal
  filled?: readonly string[]
}) => {
  const look = async (): Promise<string | undefined> => {
    const text = (await Promise.all(sources.map(readIfPresent))).join('\n')
    const url = [...text.matchAll(PAGE_URL)].map(match => match[0]).find(found => !filled.includes(found))
    if (url !== undefined || finished.aborted) return url
    await delay(250)
    return look()
  }
  return look()
}

/**
 * Fills the page the way a person would, each field found by the key its label names,
 * presses the write button, and reads the fingerprint.
 */
export const fillPage = async ({ url, values }: { url: string; values: Readonly<Record<string, string>> }) => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(url)
    await Object.entries(values).reduce<Promise<void>>(
      (done, [name, value]) =>
        done.then(async () => {
          const id = await page.locator('label.key', { hasText: new RegExp(`^${name}$`) }).getAttribute('for')
          await page.locator(`[id="${id ?? ''}"]`).fill(value)
        }),
      Promise.resolve(),
    )
    await page.locator('[data-submit]').click()
    await page.getByRole('heading', { name: 'Written.' }).waitFor()
    return (await page.locator('ul.emoji').getAttribute('aria-label')) ?? undefined
  } finally {
    await browser.close()
  }
}
